/**
 * Settings HTTP handlers. Validation lives in settings.validation.js (driven by the definitions).
 */
import { sendSuccess } from '../../utils/response.js';
import * as service from './settings.service.js';

export async function list(_req, res) {
  const sections = await service.listSections();
  return sendSuccess(res, { message: 'Settings.', data: { sections } });
}

export async function get(req, res) {
  const section = await service.getSectionForPage(req.params.section);
  return sendSuccess(res, { message: 'Settings section.', data: { section } });
}

export async function save(req, res) {
  const { changed, section } = await service.saveSection(req.params.section, req.body?.values, req);
  const message = changed
    ? `${section.title} saved. ${changed === 1 ? '1 setting' : `${changed} settings`} changed.`
    : 'Nothing changed, so nothing was saved.';
  return sendSuccess(res, { message, data: { section, changed } });
}

export async function reset(req, res) {
  const { changed, section } = await service.resetSection(req.params.section, req);
  const message = changed
    ? `${section.title} is back to the default values.`
    : `${section.title} already uses the default values.`;
  return sendSuccess(res, { message, data: { section, changed } });
}
