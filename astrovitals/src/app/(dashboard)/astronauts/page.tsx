import { Suspense } from "react";

export default function AstronautsPage() {
  return (
    <Suspense fallback={<p>Loading crew overview...</p>}>
      <div className="p-6 bg-card border border-border rounded-lg">
        <h1 className="text-2xl font-bold mb-6">Crew Overview - Mission Control</h1>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Summary cards for each astronaut */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-3xl font-bold text-primary">3</div>
            <div className="text-sm text-muted-foreground">Astronauts</div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-3xl font-medium text-green-600">2</div>
            <div className="text-sm text-muted-foreground">Nominal</div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-3xl font-medium text-amber-500">1</div>
            <div className="text-sm text-muted-foreground">Watch</div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-3xl font-medium text-red-500">0</div>
            <div className="text-sm text-muted-foreground">Critical</div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-header">
                <th className="p-3 text-left">Astronaut</th>
                <th className="p-3 text-left">Role</th>
                <th className="p-3 text-left">Last Reading</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border hover:bg-accent/20">
                <td className="p-3">Cmd. Rivera</td>
                <td className="p-3">Medical Officer</td>
                <td className="p-3">HR: 72 bpm</td>
                <td className="p-3"><span className="rounded px-2 py-1 text-xs font-medium bg-green-100 text-green-800">GREEN</span></td>
                <td className="p-3">
                  <button className="bg-primary text-primary-foreground rounded-lg py-1 px-2 text-xs">View</button>
                  <button className="bg-secondary text-secondary-foreground rounded-lg py-1 px-2 text-xs ml-1">Export</button>
                </td>
              </tr>
              <tr className="border-b border-border hover:bg-accent/20">
                <td className="p-3">Eng. Kowalski</td>
                <td className="p-3">Astronaut</td>
                <td className="p-3">BP: 110/70</td>
                <td className="p-3"><span className="rounded px-2 py-1 text-xs font-medium bg-green-100 text-green-800">GREEN</span></td>
                <td className="p-3">
                  <button className="bg-primary text-primary-foreground rounded-lg py-1 px-2 text-xs">View</button>
                  <button className="bg-secondary text-secondary-foreground rounded-lg py-1 px-2 text-xs ml-1">Export</button>
                </td>
              </tr>
              <tr className="border-b border-border hover:bg-accent/20">
                <td className="p-3">Dr. Chen</td>
                <td className="p-3">Medical Officer</td>
                <td className="p-3">HR: 105 bpm</td>
                <td className="p-3"><span className="rounded px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800">YELLOW</span></td>
                <td className="p-3">
                  <button className="bg-primary text-primary-foreground rounded-lg py-1 px-2 text-xs">View</button>
                  <button className="bg-secondary text-secondary-foreground rounded-lg py-1 px-2 text-xs ml-1">Export</button>
                </td>
              </tr>
              <tr className="border-b border-border hover:bg-accent/20">
                <td className="p-3">Lt. Morales</td>
                <td className="p-3">Astronaut</td>
                <td className="p-3">Temp: 37.5°C</td>
                <td className="p-3"><span className="rounded px-2 py-1 text-xs font-medium bg-red-100 text-red-800">RED</span></td>
                <td className="p-3">
                  <button className="bg-primary text-primary-foreground rounded-lg py-1 px-2 text-xs">View</button>
                  <button className="bg-secondary text-secondary-foreground rounded-lg py-1 px-2 text-xs ml-1">Export</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 px-4">
            Export Full Report (CSV)
          </button>
          <button className="flex-1 bg-secondary text-secondary-foreground rounded-lg py-2 px-4">
            Filter by Status
          </button>
        </div>
      </div>
    </Suspense>
  );
}