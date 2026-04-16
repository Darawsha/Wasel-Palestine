import { sleep } from 'k6';
import http from 'k6/http';
import {
  createReport,
  deleteMyReport,
  updateMyReport,
} from '../clients/reports.js';
import {
  buildReportPayload,
  buildReportUpdatePayload,
} from '../data/payloads.js';
import { expectAnyStatus, expectStatus } from '../helpers/checks.js';

const createResponseCallback = http.expectedStatuses(201, 400);

export function runWriteHeavy(token) {
  const createPayload = buildReportPayload();
  const createResponse = createReport(token, createPayload, {
    responseCallback: createResponseCallback,
  });
  const acceptedCreateStatus = expectAnyStatus(
    createResponse,
    [201, 400],
    'POST /reports/create',
  );

  if (!acceptedCreateStatus || createResponse.status !== 201) {
    sleep(Number(__ENV.WRITE_SLEEP || 1));
    return;
  }

  let reportId = null;
  try {
    reportId = createResponse.json('reportId');
  } catch (_error) {
    reportId = null;
  }

  if (!reportId) {
    sleep(Number(__ENV.WRITE_SLEEP || 1));
    return;
  }

  expectStatus(
    updateMyReport(token, reportId, buildReportUpdatePayload(createPayload)),
    200,
    'PATCH /reports/my/:id',
  );
  expectStatus(deleteMyReport(token, reportId), 200, 'DELETE /reports/my/:id');

  sleep(Number(__ENV.WRITE_SLEEP || 1));
}
