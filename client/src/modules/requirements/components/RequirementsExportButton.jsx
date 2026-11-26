/**
 * Export button for the Requirements list: downloads the requirements currently shown
 * (In progress / Closed / All) as an Excel file.
 * Kept in its own file so RequirementList.jsx only needs one import and one button.
 */
import { Download } from 'lucide-react';
import { Button } from '../../../components/ui-kit';
import { downloadExcel, fileDate } from '../../../utils/exportExcel';
import { stageBadge } from '../config/stages';
import './RequirementsExportButton.css';

const FILTER_NAMES = { open: 'in-progress', closed: 'closed', all: 'all' };

const EXPORT_COLUMNS = [
  { header: 'Requirement', value: (r) => r.requirementNo },
  { header: 'Sales order', value: (r) => r.salesOrderRef },
  { header: 'From', value: (r) => r.from?.name },
  { header: 'To', value: (r) => r.to?.name },
  { header: 'Distance (km)', value: (r) => r.distanceKm, type: 'number' },
  { header: 'Material', value: (r) => r.material },
  { header: 'Quantity (t)', value: (r) => r.quantityTonnes, type: 'number' },
  { header: 'Vehicle', value: (r) => r.vehicleType?.name },
  { header: 'Loading date', value: (r) => r.loadingDate, type: 'date' },
  { header: 'Delivery date', value: (r) => r.deliveryDate, type: 'date' },
  { header: 'Stage', value: (r) => stageBadge(r).label },
  { header: 'Coordinator', value: (r) => r.coordinator },
  { header: 'Created by', value: (r) => r.createdBy },
  { header: 'Created', value: (r) => r.createdAt, type: 'datetime' },
  { header: 'Last update', value: (r) => r.lastUpdate?.message },
  { header: 'Last update at', value: (r) => r.lastUpdate?.at, type: 'datetime' },
];

export default function RequirementsExportButton({ items = [], filter = 'all' }) {
  const exportList = () =>
    downloadExcel(`requirements-${FILTER_NAMES[filter] || 'all'}-${fileDate()}.xlsx`, EXPORT_COLUMNS, items, {
      sheetName: 'Requirements',
    });

  return (
    <Button
      className="req-export"
      variant="secondary"
      size="sm"
      icon={Download}
      onClick={exportList}
      disabled={!items.length}
    >
      Export
    </Button>
  );
}
