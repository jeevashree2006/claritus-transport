import './PageHeader.css';

/**
 * Page title row: title + subtitle on the left, actions on the right.
 *   <PageHeader title="Transporters" subtitle="..." actions={<Button>Add</Button>} />
 */
export function PageHeader({ title, subtitle, actions, className = '' }) {
  return (
    <header className={['page-header', className].filter(Boolean).join(' ')}>
      <div className="page-header__text">
        <h1 className="page-header__title">{title}</h1>
        {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  );
}

export default PageHeader;
