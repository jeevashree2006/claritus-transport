/**
 * Route summary: from -> to with the distance. Used on the create form (live preview)
 * and the detail page.
 */
import { ArrowRight, MapPin } from 'lucide-react';
import { Loader } from '../../../components/ui-kit';
import { formatNumber } from '../utils/format';
import './RoutePlate.css';

export default function RoutePlate({ from, to, distanceKm, loading = false, note }) {
  return (
    <section className="route-plate" aria-label="Route">
      <div className="route-plate__places">
        <div className="route-plate__place">
          <span className="route-plate__caption">
            <MapPin size={14} aria-hidden="true" /> Loading at
          </span>
          <span className="route-plate__name">{from || 'Choose a place'}</span>
        </div>
        <ArrowRight size={22} aria-hidden="true" className="route-plate__arrow" />
        <div className="route-plate__place">
          <span className="route-plate__caption">
            <MapPin size={14} aria-hidden="true" /> Destination
          </span>
          <span className="route-plate__name">{to || 'Choose a place'}</span>
        </div>
      </div>

      <div className="route-plate__distance">
        {loading ? (
          <Loader size="sm" label="Calculating distance" />
        ) : (
          <>
            <span className="route-plate__km">{distanceKm ? formatNumber(distanceKm) : '–'}</span>
            <span className="route-plate__unit">km</span>
          </>
        )}
      </div>

      {note && <p className="route-plate__note">{note}</p>}
    </section>
  );
}
