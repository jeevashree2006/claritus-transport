/**
 * Requirements HTTP handlers: validate input, call the service, send the response.
 */
import { AppError } from '../../utils/AppError.js';
import { sendSuccess } from '../../utils/response.js';
import * as service from './requirements.service.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const toId = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const text = (v) => (typeof v === 'string' ? v.trim() : '');

function isRealDate(s) {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Returns { value, errors } - errors is { field: message } for the form. */
function validateCreate(body = {}) {
  const errors = {};
  const value = {
    fromLocationId: toId(body.fromLocationId),
    toLocationId: toId(body.toLocationId),
    material: text(body.material),
    quantityTonnes: Number(body.quantityTonnes),
    vehicleTypeId: toId(body.vehicleTypeId),
    loadingDate: text(body.loadingDate),
    deliveryDate: text(body.deliveryDate) || null,
    salesOrderRef: text(body.salesOrderRef) || null,
  };

  if (!value.fromLocationId) errors.fromLocationId = 'Choose the loading location';
  if (!value.toLocationId) errors.toLocationId = 'Choose the destination';
  if (value.fromLocationId && value.fromLocationId === value.toLocationId) {
    errors.toLocationId = 'Destination must be different from the loading location';
  }
  if (!value.material) errors.material = 'Enter the material';
  else if (value.material.length > 200) errors.material = 'Keep the material under 200 characters';
  if (!(value.quantityTonnes > 0)) errors.quantityTonnes = 'Enter the quantity in tonnes';
  else if (value.quantityTonnes > 1000) errors.quantityTonnes = 'Quantity looks too large';
  else value.quantityTonnes = Math.round(value.quantityTonnes * 100) / 100;
  if (!value.vehicleTypeId) errors.vehicleTypeId = 'Choose a vehicle type';
  if (!value.loadingDate) errors.loadingDate = 'Choose the loading date';
  else if (!isRealDate(value.loadingDate)) errors.loadingDate = 'Enter a valid date';
  if (value.deliveryDate) {
    if (!isRealDate(value.deliveryDate)) errors.deliveryDate = 'Enter a valid date';
    else if (value.loadingDate && value.deliveryDate < value.loadingDate) {
      errors.deliveryDate = 'Delivery date can’t be before the loading date';
    }
  }
  if (value.salesOrderRef && value.salesOrderRef.length > 60) errors.salesOrderRef = 'Keep it under 60 characters';

  return { value, errors };
}

export async function lookups(_req, res) {
  const data = await service.getLookups();
  return sendSuccess(res, { message: 'Requirement lookups.', data });
}

export async function distance(req, res) {
  const fromId = toId(req.query.from);
  const toIdValue = toId(req.query.to);
  if (!fromId || !toIdValue) throw new AppError('Choose a loading location and destination.', 400);
  if (fromId === toIdValue) throw new AppError('Destination must be different from the loading location.', 400);
  const data = await service.getDistance(fromId, toIdValue);
  return sendSuccess(res, { message: 'Distance estimated.', data });
}

export async function list(req, res) {
  const status = ['open', 'closed', 'all'].includes(req.query.status) ? req.query.status : 'open';
  const data = await service.listRequirements({ status });
  return sendSuccess(res, { message: 'Requirements.', data });
}

export async function get(req, res) {
  const requirement = await service.getRequirement(req.params.ref);
  return sendSuccess(res, { message: 'Requirement.', data: { requirement } });
}

export async function create(req, res) {
  const { value, errors } = validateCreate(req.body);
  if (Object.keys(errors).length > 0) {
    throw new AppError('Check the highlighted fields.', 400, { errors });
  }
  const requirement = await service.createRequirement(value, req.user.id);
  return sendSuccess(res, { status: 201, message: `${requirement.requirementNo} created.`, data: { requirement } });
}

/* ------------------------------------------------------------------ stages */

/** Throws a 400 with field errors if any. */
function check(errors) {
  if (Object.keys(errors).length > 0) throw new AppError('Check the highlighted fields.', 400, { errors });
}

const toAmount = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
};

const VEHICLE_NO_RE = /^[A-Z]{2}\s?\d{1,2}\s?[A-Z]{0,3}\s?\d{1,4}$/;
const MOBILE_RE = /^[6-9]\d{9}$/;
const UTR_RE = /^[A-Z0-9]{10,22}$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const respond = (res, requirement, message) => sendSuccess(res, { message, data: { requirement } });

// Stage 2
export async function sendEnquiry(req, res) {
  const ids = Array.isArray(req.body?.transporterIds) ? [...new Set(req.body.transporterIds.map(toId))] : [];
  check(ids.length && !ids.includes(null) ? {} : { transporterIds: 'Pick at least one transporter' });
  const requirement = await service.sendEnquiry(req.params.ref, { transporterIds: ids }, req.user.id);
  return respond(res, requirement, `Enquiry sent to ${ids.length} transporter${ids.length > 1 ? 's' : ''}.`);
}

// Stage 3
export async function recordQuotations(req, res) {
  const raw = Array.isArray(req.body?.quotes) ? req.body.quotes : [];
  const errors = {};
  const quotes = [];
  for (const q of raw) {
    const transporterId = toId(q?.transporterId);
    const amount = toAmount(q?.amount);
    if (!transporterId) continue;
    if (!(amount > 0) || amount > 10000000) errors[`q_${transporterId}`] = 'Enter a valid amount';
    else quotes.push({ transporterId, amount });
  }
  if (!quotes.length && !Object.keys(errors).length) errors.quotes = 'Enter at least one quotation';
  check(errors);
  const requirement = await service.recordQuotations(req.params.ref, { quotes }, req.user.id);
  return respond(res, requirement, 'Quotations saved.');
}

// Stage 4
export async function approveRate(req, res) {
  const transporterId = toId(req.body?.transporterId);
  const approvedRate = toAmount(req.body?.approvedRate);
  const note = text(req.body?.note) || null;
  const errors = {};
  if (!transporterId) errors.transporterId = 'Choose a transporter';
  if (!(approvedRate > 0)) errors.approvedRate = 'Enter the final rate';
  if (note && note.length > 300) errors.note = 'Keep the note under 300 characters';
  check(errors);
  const requirement = await service.approveRate(req.params.ref, { transporterId, approvedRate, note }, req.user.id);
  return respond(res, requirement, 'Rate approved.');
}

// Stage 5
export async function bookVehicle(req, res) {
  const vehicleNo = text(req.body?.vehicleNo).toUpperCase().replace(/\s+/g, ' ');
  const driverName = text(req.body?.driverName);
  const driverMobile = text(req.body?.driverMobile).replace(/\D/g, '').slice(-10);
  const reporting = text(req.body?.expectedReportingAt);
  const errors = {};
  if (!VEHICLE_NO_RE.test(vehicleNo)) errors.vehicleNo = 'Enter the vehicle number, like TN 70 AB 4521';
  if (!driverName) errors.driverName = 'Enter the driver’s name';
  else if (driverName.length > 120) errors.driverName = 'Keep it under 120 characters';
  if (!MOBILE_RE.test(driverMobile)) errors.driverMobile = 'Enter a 10-digit mobile number';
  if (reporting && !DATETIME_RE.test(reporting)) errors.expectedReportingAt = 'Enter a valid date and time';
  check(errors);
  const requirement = await service.bookVehicle(
    req.params.ref,
    { vehicleNo, driverName, driverMobile, expectedReportingAt: reporting ? `${reporting.replace('T', ' ')}:00` : null },
    req.user.id
  );
  return respond(res, requirement, `Vehicle ${vehicleNo} booked.`);
}

// Stage 6
export async function recordMilestone(req, res) {
  const milestone = text(req.body?.milestone);
  const note = text(req.body?.note) || null;
  check(service.MILESTONES.some((m) => m.key === milestone) ? {} : { milestone: 'Unknown milestone' });
  const requirement = await service.recordMilestone(req.params.ref, { milestone, note }, req.user.id);
  return respond(res, requirement, 'Milestone recorded.');
}

// Stage 7
export async function recordDelivery(req, res) {
  const podNumber = text(req.body?.podNumber).toUpperCase();
  const rawDamage = req.body?.damageAmount;
  const damageAmount = rawDamage === '' || rawDamage === undefined || rawDamage === null ? 0 : toAmount(rawDamage);
  const damageNote = text(req.body?.damageNote) || null;
  const errors = {};
  if (!podNumber) errors.podNumber = 'Enter the POD number';
  else if (podNumber.length > 40) errors.podNumber = 'Keep it under 40 characters';
  if (!(damageAmount >= 0)) errors.damageAmount = 'Enter 0 or more';
  if (damageAmount > 0 && !damageNote) errors.damageNote = 'Describe the damage or shortage';
  check(errors);
  const requirement = await service.recordDelivery(req.params.ref, { podNumber, damageAmount, damageNote }, req.user.id);
  return respond(res, requirement, 'POD verified.');
}

// Stage 8
export async function recordPayment(req, res) {
  const amount = toAmount(req.body?.amount);
  const utr = text(req.body?.utr).toUpperCase();
  const errors = {};
  if (!(amount > 0)) errors.amount = 'Enter the amount paid';
  if (!UTR_RE.test(utr)) errors.utr = 'Enter the UTR: 10 to 22 letters and numbers';
  check(errors);
  const requirement = await service.recordPayment(req.params.ref, { amount, utr }, req.user.id);
  return respond(res, requirement, 'Payment recorded. Trip closed.');
}
