import { useState } from "react";

export default function SelectDispatchRouteModal({ routes, onClose, onProceed }) {
  const [routeId, setRouteId] = useState("");

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"><div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0a2420] p-6 shadow-2xl"><h3 className="mb-5 text-lg font-semibold text-[#eafff5]">Create dispatch</h3><label className="block text-xs text-[#9fcabd]">Select route<select required value={routeId} onChange={(event) => setRouteId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-[#eafff5] outline-none focus:border-[#1D9E75]"><option value="" disabled className="text-black">Select a route</option>{routes.map((route) => <option key={route.route_id} value={route.route_id} className="text-black">Ormoc - {route.destination?.name || `Route #${route.route_id}`}</option>)}</select></label><div className="mt-6 flex gap-3"><button onClick={onClose} className="flex-1 rounded-xl border border-white/15 py-2.5 text-sm font-medium text-[#9fcabd]">Cancel</button><button disabled={!routeId} onClick={() => onProceed(Number(routeId))} className="flex-1 rounded-xl bg-[#1D9E75] py-2.5 text-sm font-semibold text-[#04342C] disabled:opacity-50">Proceed</button></div></div></div>;
}
