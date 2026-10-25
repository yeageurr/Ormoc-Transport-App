export default function EmptyTableState({ fill = false }) {
  const sizing = fill ? 'h-full min-h-0' : 'min-h-[240px]';
  return <div className={`flex w-full ${sizing} flex-col items-center justify-center gap-2 py-5 text-center text-[#718792]`}>
    <EmptyContainerIcon />
    <span className="text-2xl font-semibold">No records found</span>
  </div>;
}

function EmptyContainerIcon() {
  return <svg className="h-16 w-16" viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <path d="m8 13 12-6 12 6v14l-12 6-12-6V13Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="m8.5 13.5 11.5 6 11.5-6M20 20v12.5M14 10l12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}
