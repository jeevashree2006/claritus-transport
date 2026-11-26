/**
 * SAMPLE DATA ONLY.
 * This file will be replaced by an API call (e.g. GET /api/dashboard?period=this-month)
 * once the Requirements and Trips modules exist. Keep the same shapes so the
 * dashboard components don't need to change.
 */
import { AlertTriangle, CircleCheckBig, ClipboardList, Truck } from 'lucide-react';

export const PERIOD_OPTIONS = [
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'this-quarter', label: 'This quarter' },
];

/** KPI cards. `trend.good` decides green/red (fewer delays is good news). */
export const kpis = [
  {
    key: 'total',
    label: 'Total requirements',
    value: 248,
    icon: ClipboardList,
    tone: 'primary',
    trend: { value: '12%', direction: 'up', good: true },
    sparkline: [180, 196, 188, 210, 205, 226, 248],
  },
  {
    key: 'in-transit',
    label: 'In transit',
    value: 64,
    icon: Truck,
    tone: 'warning',
    trend: { value: '12%', direction: 'up', good: true },
    sparkline: [48, 52, 50, 57, 55, 60, 64],
  },
  {
    key: 'delivered',
    label: 'Delivered',
    value: 172,
    icon: CircleCheckBig,
    tone: 'success',
    trend: { value: '12%', direction: 'up', good: true },
    sparkline: [120, 128, 135, 142, 150, 163, 172],
  },
  {
    key: 'delayed',
    label: 'Delayed',
    value: 12,
    icon: AlertTriangle,
    tone: 'danger',
    trend: { value: '12%', direction: 'up', good: false },
    sparkline: [8, 10, 9, 11, 9, 13, 12],
  },
];

/** Donut chart: share of trips by status. */
export const tripStatus = {
  total: 248,
  segments: [
    { key: 'delivered', label: 'Delivered', percent: 69, tone: 'success' },
    { key: 'in-transit', label: 'In transit', percent: 26, tone: 'warning' },
    { key: 'delayed', label: 'Delayed', percent: 5, tone: 'danger' },
  ],
};

/** Open requirements per stage of the 8-stage flow. */
export const requirementsByStage = [
  { stage: 'Requirement', count: 18 },
  { stage: 'Enquiry', count: 26 },
  { stage: 'Quotations', count: 22 },
  { stage: 'Rate approval', count: 10 },
  { stage: 'Booking', count: 15 },
  { stage: 'Trip follow-up', count: 64 },
  { stage: 'Delivery', count: 38 },
  { stage: 'Payment', count: 55 },
];

/** Latest requirements. `stageTone` maps to a Badge tone. */
export const recentRequirements = [
  { id: 'REQ-1048', route: 'Chennai → Pune', transporter: 'Swift Logistics', vehicle: '32 ft MXL', stage: 'Trip follow-up', stageTone: 'warning' },
  { id: 'REQ-1047', route: 'Mumbai → Delhi', transporter: 'Apex Carriers', vehicle: '20 ft container', stage: 'Quotations', stageTone: 'info' },
  { id: 'REQ-1046', route: 'Bengaluru → Hyderabad', transporter: 'Road King Movers', vehicle: '14 ft open', stage: 'Delivery', stageTone: 'success' },
  { id: 'REQ-1045', route: 'Kolkata → Patna', transporter: '-', vehicle: '19 ft closed', stage: 'Enquiry', stageTone: 'neutral' },
  { id: 'REQ-1044', route: 'Ahmedabad → Jaipur', transporter: 'Western Freight', vehicle: '24 ft SXL', stage: 'Rate approval', stageTone: 'warning' },
];

/** Things that need attention. `tone` colours the left bar. */
export const alerts = [
  { id: 'delayed', title: '3 trips delayed', detail: 'Past their ETA by more than 6 hours', tone: 'danger' },
  { id: 'pod', title: '5 PODs over 7 days', detail: 'Proof of delivery not received yet', tone: 'warning' },
  { id: 'rates', title: '2 rates waiting', detail: 'Final rates need your approval', tone: 'info' },
  { id: 'payments', title: '4 payments due this week', detail: 'Invoices verified and ready to pay', tone: 'neutral' },
];
