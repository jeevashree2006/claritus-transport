import './Table.css';

/**
 * Data table. Scrolls sideways on small screens instead of breaking the page.
 *
 *   <Table
 *     columns={[{ key: 'id', header: 'ID' }, { key: 'stage', header: 'Stage', render: (row) => <Badge>..</Badge>, align: 'right' }]}
 *     data={rows}
 *     onRowClick={(row) => navigate(...)}
 *   />
 */
export function Table({
  columns = [],
  data = [],
  onRowClick,
  emptyMessage = 'No records to show.',
  rowKey = 'id',
  caption,
  className = '',
}) {
  const clickable = typeof onRowClick === 'function';

  const handleKeyDown = (event, row) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onRowClick(row);
    }
  };

  return (
    <div className={['table-wrap', className].filter(Boolean).join(' ')}>
      <table className="table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={`table__cell--${column.align || 'left'}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length || 1} className="table__empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={row[rowKey] ?? index}
                className={clickable ? 'table__row--clickable' : undefined}
                onClick={clickable ? () => onRowClick(row) : undefined}
                onKeyDown={clickable ? (event) => handleKeyDown(event, row) : undefined}
                tabIndex={clickable ? 0 : undefined}
              >
                {columns.map((column) => (
                  <td key={column.key} className={`table__cell--${column.align || 'left'}`}>
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
