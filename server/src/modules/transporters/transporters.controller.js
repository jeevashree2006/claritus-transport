/**
 * Transporters HTTP handlers: validate input, call the service, send the response.
 * Field rules follow FRD FR-TR-002 (required), FR-TR-003 (bank format) and FR-TR-004 (optional).
 */
import { AppError } from '../../utils/AppError.js';
import { sendSuccess } from '../../utils/response.js';
import * as service from './transporters.service.js';

const MOBILE_RE = /^[6-9]\d{9}$/; // Indian 10-digit mobile
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/; // e.g. HDFC0001234
const ACCOUNT_RE = /^\d{9,18}$/; // Indian bank account numbers are 9-18 digits

const text = (v) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '');
const digitsOnly = (v) => text(v).replace(/\D/g, '').replace(/^(?:91|0)(?=\d{10}$)/, '');

/** Throws a 400 with { errors: { field: message } } for the form. */
function check(errors) {
  if (Object.keys(errors).length > 0) throw new AppError('Check the highlighted fields.', 400, { errors });
}

function maxLen(errors, field, value, max) {
  if (value && value.length > max) errors[field] = `Keep it under ${max} characters`;
}

/** Returns { value, errors } for create and update. */
function validateTransporter(body = {}) {
  const errors = {};
  const value = {
    name: text(body.name),
    contactPerson: text(body.contactPerson),
    mobile: digitsOnly(body.mobile),
    whatsapp: digitsOnly(body.whatsapp),
    city: text(body.city) || null,
    address: text(body.address) || null,
    regularRoutes: text(body.regularRoutes) || null,
    bank: null,
  };

  if (!value.name) errors.name = 'Enter the company name';
  maxLen(errors, 'name', value.name, 150);
  if (!value.contactPerson) errors.contactPerson = 'Enter the contact person';
  maxLen(errors, 'contactPerson', value.contactPerson, 120);
  if (!MOBILE_RE.test(value.mobile)) errors.mobile = 'Enter a 10-digit mobile number';
  if (!MOBILE_RE.test(value.whatsapp)) errors.whatsapp = 'Enter a 10-digit WhatsApp number';
  maxLen(errors, 'city', value.city, 80);
  maxLen(errors, 'address', value.address, 255);
  maxLen(errors, 'regularRoutes', value.regularRoutes, 500);

  // Bank details are all-or-nothing: either leave all four empty, or fill all four.
  const b = body.bank || {};
  const bank = {
    accountHolder: text(b.accountHolder),
    bankName: text(b.bankName),
    accountNumber: text(b.accountNumber).replace(/\s+/g, ''),
    ifsc: text(b.ifsc).toUpperCase().replace(/\s+/g, ''),
  };
  const anyBank = Object.values(bank).some(Boolean);
  if (anyBank) {
    if (!bank.accountHolder) errors.accountHolder = 'Enter the account holder name';
    maxLen(errors, 'accountHolder', bank.accountHolder, 150);
    if (!bank.bankName) errors.bankName = 'Enter the bank name';
    maxLen(errors, 'bankName', bank.bankName, 120);
    if (!ACCOUNT_RE.test(bank.accountNumber)) errors.accountNumber = 'Enter the account number: 9 to 18 digits';
    if (!IFSC_RE.test(bank.ifsc)) errors.ifsc = 'Enter a valid IFSC, like HDFC0001234';
    value.bank = bank;
  }

  return { value, errors };
}

/* ---------------------------------------------------------------- handlers */

export async function list(req, res) {
  const status = ['active', 'inactive', 'all'].includes(req.query.status) ? req.query.status : 'all';
  const bank = req.query.bank === 'pending' ? 'pending' : '';
  const search = text(req.query.search).slice(0, 100);
  const data = await service.listTransporters({ search, status, bank });
  return sendSuccess(res, { message: 'Transporters.', data });
}

export async function get(req, res) {
  const transporter = await service.getTransporter(req.params.ref);
  return sendSuccess(res, { message: 'Transporter.', data: { transporter } });
}

export async function create(req, res) {
  const { value, errors } = validateTransporter(req.body);
  check(errors);
  const transporter = await service.createTransporter(value, req.user.id, req);
  const message = value.bank
    ? `${transporter.name} added. Bank details are waiting for a second approval.`
    : `${transporter.name} added.`;
  return sendSuccess(res, { status: 201, message, data: { transporter } });
}

export async function update(req, res) {
  const { value, errors } = validateTransporter(req.body);
  check(errors);
  const { transporter, bankChangeRequested } = await service.updateTransporter(req.params.ref, value, req.user.id, req);
  const message = bankChangeRequested
    ? 'Changes saved. The new bank details are waiting for a second approval.'
    : 'Changes saved.';
  return sendSuccess(res, { message, data: { transporter } });
}

export async function setStatus(req, res) {
  if (typeof req.body?.isActive !== 'boolean') check({ isActive: 'Choose active or inactive' });
  const transporter = await service.setActive(req.params.ref, req.body.isActive, req);
  const message = transporter.isActive
    ? `${transporter.name} is active again.`
    : `${transporter.name} is deactivated. It stays in history but can't be picked for new enquiries.`;
  return sendSuccess(res, { message, data: { transporter } });
}

export async function approveBank(req, res) {
  const transporter = await service.approveBank(req.params.ref, req.user.id, req);
  return sendSuccess(res, { message: 'Bank details approved. They can now be used for payments.', data: { transporter } });
}

export async function rejectBank(req, res) {
  const note = text(req.body?.note);
  const errors = {};
  if (!note) errors.note = 'Give a reason for rejecting';
  maxLen(errors, 'note', note, 300);
  check(errors);
  const transporter = await service.rejectBank(req.params.ref, note, req.user.id, req);
  return sendSuccess(res, { message: 'Bank details rejected.', data: { transporter } });
}
