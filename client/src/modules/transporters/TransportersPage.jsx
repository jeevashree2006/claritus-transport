/**
 * Transporters module entry point (route /transporters).
 * Sub-views use the query string so no shared routing file has to change:
 *   /transporters              -> list (add / edit open in a dialog)
 *   /transporters?id=TR0001    -> profile with bank details, history, balance and performance
 */
import { useSearchParams } from 'react-router-dom';
import TransporterDetail from './pages/TransporterDetail';
import TransporterList from './pages/TransporterList';
import './TransportersPage.css';

export default function TransportersPage() {
  const [params, setParams] = useSearchParams();
  const id = params.get('id');

  const nav = {
    toList: () => setParams({}),
    toDetail: (code) => setParams({ id: code }),
  };

  if (id) return <TransporterDetail key={id} transporterRef={id} nav={nav} />;
  return <TransporterList nav={nav} />;
}
