import ormocDriverMark from '../../assets/ormoc-driver-mark.png';

export default function BrandHeader({ compact = false }) {
  return (
    <div className={`flex items-center ${compact ? 'gap-4' : 'gap-5'}`}>
      <img
        src={ormocDriverMark}
        alt="Ormoc City transport logo"
        className={`shrink-0 object-contain ${compact ? 'size-14' : 'size-24'}`}
      />
      <div>
        <p className={`font-bold leading-tight text-sky-700 ${compact ? 'text-lg' : 'text-3xl'}`}>Ormoc Transport App</p>
        <p className={`mt-1 italic text-slate-800 ${compact ? 'text-sm' : 'text-lg'}`}>Ticketing Officer</p>
      </div>
    </div>
  );
}
