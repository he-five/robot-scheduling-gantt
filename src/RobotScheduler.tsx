import React, { useState, useMemo } from 'react';
import { Package, Layers, ZoomIn, ZoomOut } from 'lucide-react';

const RobotSchedulerGantt = () => {
  const [timeScale, setTimeScale] = useState(1); // pixels per second
  const [viewWindow, setViewWindow] = useState({ start: 0, end: 1200 }); // viewing window in seconds
  
  // Station configurations
  const stations = {
    diskPack: {
      count: 6,
      waitTime: 250,
      loadTime: 12,
      unloadTime: 12,
      color: '#3B82F6', // blue
      lightColor: '#DBEAFE',
      name: 'Disk-pack',
      icon: Package
    },
    spacerTray: {
      count: 6,
      waitTime: 125,
      loadTime: 12,
      unloadTime: 12,
      color: '#10B981', // green
      lightColor: '#D1FAE5',
      name: 'Spacer-tray',
      icon: Layers
    }
  };

  // Generate schedule with dedicated stations (Disk-pack stations only do Disk-pack, Spacer-tray stations only do Spacer-tray)
  const scheduleData = useMemo(() => {
    const allTasks = [];
    let robotTime = 0;
    
    // Track when each station becomes available and processing completion
    const stationAvailable = {};
    const stationProcessingEnd = {};
    Object.keys(stations).forEach(type => {
      stationAvailable[type] = Array(stations[type].count).fill(0);
      stationProcessingEnd[type] = Array(stations[type].count).fill(null);
    });
    
    let diskPackCycles = 0;
    let spacerTrayCycles = 0;
    let totalCycles = 0;
    
    // PHASE 1: Load all stations initially with their dedicated part types
    console.log("PHASE 1: Initial loading of all dedicated stations");
    
    // Load all Disk-pack stations
    for (let i = 0; i < stations.diskPack.count; i++) {
      const config = stations.diskPack;
      
      const loadTask = {
        id: `initial-diskpack-${i}-load`,
        startTime: robotTime,
        duration: config.loadTime,
        endTime: robotTime + config.loadTime,
        type: 'diskPack',
        stationId: i + 1,
        action: 'load',
        cycle: diskPackCycles + 1
      };
      
      const processTask = {
        id: `initial-diskpack-${i}-process`,
        startTime: loadTask.endTime,
        duration: config.waitTime,
        endTime: loadTask.endTime + config.waitTime,
        type: 'diskPack',
        stationId: i + 1,
        action: 'process',
        cycle: diskPackCycles + 1
      };
      
      allTasks.push(loadTask, processTask);
      robotTime = loadTask.endTime;
      
      stationProcessingEnd['diskPack'][i] = processTask.endTime;
      diskPackCycles++;
      totalCycles++;
    }
    
    // Load all Spacer-tray stations
    for (let i = 0; i < stations.spacerTray.count; i++) {
      const config = stations.spacerTray;
      
      const loadTask = {
        id: `initial-spacertray-${i}-load`,
        startTime: robotTime,
        duration: config.loadTime,
        endTime: robotTime + config.loadTime,
        type: 'spacerTray',
        stationId: i + 1,
        action: 'load',
        cycle: spacerTrayCycles + 1
      };
      
      const processTask = {
        id: `initial-spacertray-${i}-process`,
        startTime: loadTask.endTime,
        duration: config.waitTime,
        endTime: loadTask.endTime + config.waitTime,
        type: 'spacerTray',
        stationId: i + 1,
        action: 'process',
        cycle: spacerTrayCycles + 1
      };
      
      allTasks.push(loadTask, processTask);
      robotTime = loadTask.endTime;
      
      stationProcessingEnd['spacerTray'][i] = processTask.endTime;
      spacerTrayCycles++;
      totalCycles++;
    }
    
    // PHASE 2: Dedicated station reload cycles
    console.log("PHASE 2: Dedicated station reload cycles");
    
    // Continue until we've completed 152 total cycles (approximately 1 hour)
    while (totalCycles < 152) {
      // Find the earliest completing station across all types
      let earliestTime = Infinity;
      let earliestType = null;
      let earliestIndex = null;
      
      Object.keys(stations).forEach(type => {
        stations[type].count && Array.from({length: stations[type].count}).forEach((_, index) => {
          const completionTime = stationProcessingEnd[type][index];
          if (completionTime !== null && completionTime < earliestTime) {
            earliestTime = completionTime;
            earliestType = type;
            earliestIndex = index;
          }
        });
      });
      
      if (earliestType === null) break; // No more processing stations
      
      // Wait for earliest station to complete processing
      robotTime = Math.max(robotTime, earliestTime);
      
      // Unload the completed station
      const config = stations[earliestType];
      const unloadTask = {
        id: `cycle-${totalCycles}-unload`,
        startTime: robotTime,
        duration: config.unloadTime,
        endTime: robotTime + config.unloadTime,
        type: earliestType,
        stationId: earliestIndex + 1,
        action: 'unload',
        cycle: 'dedicated-reload'
      };
      
      allTasks.push(unloadTask);
      robotTime = unloadTask.endTime;
      
      // Station becomes available immediately after unload
      stationAvailable[earliestType][earliestIndex] = robotTime;
      stationProcessingEnd[earliestType][earliestIndex] = null;
      
      // Immediately reload the SAME station with the SAME part type
      const nextLoadTask = {
        id: `cycle-${totalCycles}-load`,
        startTime: robotTime, // Immediately after unload
        duration: config.loadTime,
        endTime: robotTime + config.loadTime,
        type: earliestType, // SAME part type as the station is dedicated to
        stationId: earliestIndex + 1, // SAME physical station
        action: 'load',
        cycle: earliestType === 'diskPack' ? diskPackCycles + 1 : spacerTrayCycles + 1
      };
      
      // Processing for next part starts immediately after load
      const nextProcessTask = {
        id: `cycle-${totalCycles}-process`,
        startTime: nextLoadTask.endTime,
        duration: config.waitTime,
        endTime: nextLoadTask.endTime + config.waitTime,
        type: earliestType, // SAME part type
        stationId: earliestIndex + 1, // SAME physical station
        action: 'process',
        cycle: earliestType === 'diskPack' ? diskPackCycles + 1 : spacerTrayCycles + 1
      };
      
      allTasks.push(nextLoadTask, nextProcessTask);
      robotTime = nextLoadTask.endTime;
      
      // Track processing completion for the same station with same part type
      stationProcessingEnd[earliestType][earliestIndex] = nextProcessTask.endTime;
      
      // Update cycle counters
      if (earliestType === 'diskPack') {
        diskPackCycles++;
      } else {
        spacerTrayCycles++;
      }
      totalCycles++;
    }
    
    // PHASE 3: Unload all remaining stations
    console.log("PHASE 3: Final unloading of dedicated stations");
    
    while (true) {
      // Find stations still processing
      let foundProcessing = false;
      let earliestTime = Infinity;
      let earliestType = null;
      let earliestIndex = null;
      
      Object.keys(stations).forEach(type => {
        stations[type].count && Array.from({length: stations[type].count}).forEach((_, index) => {
          const completionTime = stationProcessingEnd[type][index];
          if (completionTime !== null) {
            foundProcessing = true;
            if (completionTime < earliestTime) {
              earliestTime = completionTime;
              earliestType = type;
              earliestIndex = index;
            }
          }
        });
      });
      
      if (!foundProcessing) break; // No more stations processing
      
      // Wait for station to complete and unload it
      robotTime = Math.max(robotTime, earliestTime);
      
      const config = stations[earliestType];
      const finalUnloadTask = {
        id: `final-${earliestType}-${earliestIndex}-unload`,
        startTime: robotTime,
        duration: config.unloadTime,
        endTime: robotTime + config.unloadTime,
        type: earliestType,
        stationId: earliestIndex + 1,
        action: 'unload',
        cycle: 'final'
      };
      
      allTasks.push(finalUnloadTask);
      robotTime = finalUnloadTask.endTime;
      stationProcessingEnd[earliestType][earliestIndex] = null;
    }
    
    return allTasks.sort((a, b) => a.startTime - b.startTime);
  }, []);

  // Simulation timer - removed

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTaskColor = (task) => {
    const config = stations[task.type];
    switch (task.action) {
      case 'load':
        // Load operations: Darker/stronger colors
        return task.type === 'diskPack' ? '#1E40AF' : '#047857'; // Dark blue for Disk-pack load, Dark green for Spacer-tray load
      case 'process':
        // Process operations: Light colors with dashed border
        return config.lightColor;
      case 'unload':
        // Unload operations: Medium colors
        return task.type === 'diskPack' ? '#60A5FA' : '#34D399'; // Light blue for Disk-pack unload, Light green for Spacer-tray unload
      default:
        return '#6B7280';
    }
  };

  const getTaskBorder = (task) => {
    const config = stations[task.type];
    return task.action === 'process' ? `2px dashed ${config.color}` : 'none';
  };

  // Create rows for Gantt chart
  const ganttRows = useMemo(() => {
    const rows = [];
    
    // Add robot row
    const robotTasks = scheduleData.filter(task => task.action !== 'process');
    rows.push({
      id: 'robot',
      label: 'Robot Operations',
      type: 'robot',
      tasks: robotTasks
    });
    
    // Add station rows
    ['diskPack', 'spacerTray'].forEach(stationType => {
      const config = stations[stationType];
      for (let i = 1; i <= config.count; i++) {
        const stationTasks = scheduleData.filter(
          task => task.type === stationType && task.stationId === i
        );
        rows.push({
          id: `${stationType}-${i}`,
          label: `${config.name} Station ${i}`,
          type: stationType,
          tasks: stationTasks
        });
      }
    });
    
    return rows;
  }, [scheduleData]);

  const zoomIn = () => setTimeScale(prev => Math.min(prev * 1.5, 10));
  const zoomOut = () => setTimeScale(prev => Math.max(prev / 1.5, 0.1));

  const chartWidth = (viewWindow.end - viewWindow.start) * timeScale;
  const timelineHeight = 40;
  const rowHeight = 50;
  const labelWidth = 200;

  return (
    <div className="max-w-full mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Robot Scheduling Gantt Chart</h1>
        <p className="text-gray-600">Visual timeline of Disk-pack and Spacer-tray slots operations</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg p-4 shadow mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button onClick={zoomOut} className="p-2 bg-gray-200 hover:bg-gray-300 rounded">
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">Zoom: {timeScale.toFixed(1)}x</span>
              <button onClick={zoomIn} className="p-2 bg-gray-200 hover:bg-gray-300 rounded">
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-sm text-gray-600">
              <strong>Static Schedule View</strong> - 152 Cycles (12 Stations: 6 Disk-pack + 6 Spacer-tray)
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-lg p-4 shadow mb-6">
        <h3 className="font-semibold mb-3">Legend</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Disk-pack Operations</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-800 rounded"></div>
                <span className="text-sm">Load Disk-pack</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-300 rounded"></div>
                <span className="text-sm">Unload Disk-pack</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-100 border-2 border-dashed border-blue-600 rounded"></div>
                <span className="text-sm">Processing Disk-pack</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Spacer-tray Operations</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-700 rounded"></div>
                <span className="text-sm">Load Spacer-tray</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-400 rounded"></div>
                <span className="text-sm">Unload Spacer-tray</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border-2 border-dashed border-green-600 rounded"></div>
                <span className="text-sm">Processing Spacer-tray</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-sm">Complete Schedule Overview - 152 Cycles (12 Stations Total)</span>
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="flex">
          {/* Row Labels */}
          <div className="bg-gray-50 border-r" style={{ width: labelWidth }}>
            {/* Timeline header space */}
            <div style={{ height: timelineHeight }} className="border-b bg-gray-100 flex items-center px-4 font-semibold">
              Timeline
            </div>
            
            {ganttRows.map((row, index) => (
              <div
                key={row.id}
                style={{ height: rowHeight }}
                className={`border-b px-4 flex items-center text-sm font-medium ${
                  row.type === 'robot' ? 'bg-gray-200' : 
                  row.type === 'diskPack' ? 'bg-blue-50' : 'bg-green-50'
                }`}
              >
                {row.label}
              </div>
            ))}
          </div>

          {/* Chart Area */}
          <div className="flex-1 overflow-x-auto">
            <div style={{ width: Math.max(chartWidth, 800) }}>
              {/* Timeline */}
              <div style={{ height: timelineHeight }} className="border-b bg-gray-100 relative">
                {Array.from({ length: Math.ceil(viewWindow.end / 60) + 1 }, (_, i) => i * 60).map(time => (
                  <div
                    key={time}
                    className="absolute border-l border-gray-300 h-full flex items-center"
                    style={{ left: time * timeScale }}
                  >
                    <span className="text-xs text-gray-600 ml-2">{formatTime(time)}</span>
                  </div>
                ))}
              </div>

              {/* Chart Rows */}
              {ganttRows.map((row, rowIndex) => (
                <div
                  key={row.id}
                  style={{ height: rowHeight }}
                  className="border-b relative"
                >
                  {/* Grid lines */}
                  {Array.from({ length: Math.ceil(viewWindow.end / 60) + 1 }, (_, i) => i * 60).map(time => (
                    <div
                      key={time}
                      className="absolute border-l border-gray-200 h-full"
                      style={{ left: time * timeScale }}
                    />
                  ))}

                  {/* Tasks */}
                  {row.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="absolute rounded text-xs text-white font-medium flex items-center px-2"
                      style={{
                        left: task.startTime * timeScale,
                        width: Math.max(task.duration * timeScale, 20),
                        height: rowHeight - 10,
                        top: 5,
                        backgroundColor: getTaskColor(task),
                        border: getTaskBorder(task),
                        color: task.action === 'process' ? stations[task.type].color : 'white'
                      }}
                      title={`${task.action.charAt(0).toUpperCase() + task.action.slice(1)} - ${stations[task.type].name} Station ${task.stationId} (${formatTime(task.startTime)} - ${formatTime(task.endTime)})`}
                    >
                      <span className="truncate">
                        {task.action === 'process' ? 'Processing' : 
                         task.action === 'load' ? 'Load' : 'Unload'}
                        {task.duration * timeScale > 60 && ` (${task.duration}s)`}
                      </span>
                    </div>
                  ))}
                </div>
              ))}

              {/* Current Time Indicator - removed */}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="mt-6 grid md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="font-semibold text-gray-700">Total Robot Operations</h4>
          <p className="text-2xl font-bold text-blue-600">{scheduleData.filter(t => t.action !== 'process').length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="font-semibold text-gray-700">Robot Utilization</h4>
          <p className="text-2xl font-bold text-green-600">
            {(() => {
              const robotOps = scheduleData.filter(t => t.action !== 'process');
              const totalRobotTime = robotOps.reduce((sum, op) => sum + op.duration, 0);
              const lastOpEnd = Math.max(...robotOps.map(op => op.endTime));
              return lastOpEnd > 0 ? `${((totalRobotTime / lastOpEnd) * 100).toFixed(1)}%` : '0%';
            })()}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="font-semibold text-gray-700">Total Station Wait Time</h4>
          <p className="text-2xl font-bold text-orange-600">
            {(() => {
              // Calculate total time stations wait after processing completes
              let totalWaitTime = 0;
              const processTasks = scheduleData.filter(t => t.action === 'process');
              const unloadTasks = scheduleData.filter(t => t.action === 'unload');
              
              processTasks.forEach(processTask => {
                const matchingUnload = unloadTasks.find(unload => 
                  unload.type === processTask.type && 
                  unload.stationId === processTask.stationId &&
                  unload.startTime >= processTask.endTime
                );
                if (matchingUnload) {
                  totalWaitTime += (matchingUnload.startTime - processTask.endTime);
                }
              });
              
              return `${totalWaitTime}s`;
            })()}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="font-semibold text-gray-700">Disk-pack Cycles</h4>
          <p className="text-2xl font-bold text-blue-600">{scheduleData.filter(t => t.type === 'diskPack' && t.action === 'load').length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="font-semibold text-gray-700">Spacer-tray Cycles</h4>
          <p className="text-2xl font-bold text-green-600">{scheduleData.filter(t => t.type === 'spacerTray' && t.action === 'load').length}</p>
        </div>
      </div>

      {/* Individual Station Idle Time Analysis */}
      <div className="mt-6 bg-white rounded-lg p-6 shadow">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Station Idle Time Analysis</h3>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Disk-pack Stations */}
          <div>
            <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Disk-pack Stations
            </h4>
            <div className="space-y-2">
              {Array.from({length: stations.diskPack.count}, (_, stationIndex) => {
                const stationId = stationIndex + 1;
                
                // Calculate idle time for this specific station
                const stationProcessTasks = scheduleData.filter(t => 
                  t.action === 'process' && t.type === 'diskPack' && t.stationId === stationId
                );
                const stationUnloadTasks = scheduleData.filter(t => 
                  t.action === 'unload' && t.type === 'diskPack' && t.stationId === stationId
                );
                
                let totalIdleTime = 0;
                let maxIdleTime = 0;
                let cycleCount = 0;
                
                stationProcessTasks.forEach(processTask => {
                  const matchingUnload = stationUnloadTasks.find(unload => 
                    unload.startTime >= processTask.endTime
                  );
                  if (matchingUnload) {
                    const idleTime = matchingUnload.startTime - processTask.endTime;
                    totalIdleTime += idleTime;
                    maxIdleTime = Math.max(maxIdleTime, idleTime);
                    cycleCount++;
                  }
                });
                
                const avgIdleTime = cycleCount > 0 ? (totalIdleTime / cycleCount).toFixed(1) : '0';
                
                return (
                  <div key={stationId} className="bg-blue-50 p-3 rounded border-l-4 border-blue-500">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-blue-800">Station {stationId}</span>
                      <span className="text-sm text-blue-600">{cycleCount} cycles</span>
                    </div>
                    <div className="mt-1 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Total:</span>
                        <span className="ml-1 font-medium">{totalIdleTime}s</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Avg:</span>
                        <span className="ml-1 font-medium">{avgIdleTime}s</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Max:</span>
                        <span className="ml-1 font-medium">{maxIdleTime}s</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Spacer-tray Stations */}
          <div>
            <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Layers className="w-5 h-5 text-green-600" />
              Spacer-tray Stations
            </h4>
            <div className="space-y-2">
              {Array.from({length: stations.spacerTray.count}, (_, stationIndex) => {
                const stationId = stationIndex + 1;
                
                // Calculate idle time for this specific station
                const stationProcessTasks = scheduleData.filter(t => 
                  t.action === 'process' && t.type === 'spacerTray' && t.stationId === stationId
                );
                const stationUnloadTasks = scheduleData.filter(t => 
                  t.action === 'unload' && t.type === 'spacerTray' && t.stationId === stationId
                );
                
                let totalIdleTime = 0;
                let maxIdleTime = 0;
                let cycleCount = 0;
                
                stationProcessTasks.forEach(processTask => {
                  const matchingUnload = stationUnloadTasks.find(unload => 
                    unload.startTime >= processTask.endTime
                  );
                  if (matchingUnload) {
                    const idleTime = matchingUnload.startTime - processTask.endTime;
                    totalIdleTime += idleTime;
                    maxIdleTime = Math.max(maxIdleTime, idleTime);
                    cycleCount++;
                  }
                });
                
                const avgIdleTime = cycleCount > 0 ? (totalIdleTime / cycleCount).toFixed(1) : '0';
                
                return (
                  <div key={stationId} className="bg-green-50 p-3 rounded border-l-4 border-green-500">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-green-800">Station {stationId}</span>
                      <span className="text-sm text-green-600">{cycleCount} cycles</span>
                    </div>
                    <div className="mt-1 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Total:</span>
                        <span className="ml-1 font-medium">{totalIdleTime}s</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Avg:</span>
                        <span className="ml-1 font-medium">{avgIdleTime}s</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Max:</span>
                        <span className="ml-1 font-medium">{maxIdleTime}s</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Summary Insights */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="font-medium text-gray-700 mb-2">Key Insights:</h4>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <strong>6 Disk-pack Stations:</strong> With doubled capacity, each station cycles less frequently, reducing individual station wait times. Longer processing cycles (250s) still compete with Spacer-tray for robot attention.
            </div>
            <div>
              <strong>6 Spacer-tray Stations:</strong> Doubled capacity allows more parallel processing. Shorter cycles (125s) mean more frequent robot demand, but distributed across more stations.
            </div>
          </div>
        </div>
      </div>

      {/* Conflict Detection Alert */}
      {(() => {
        const robotOps = scheduleData.filter(t => t.action !== 'process').sort((a, b) => a.startTime - b.startTime);
        const conflicts = [];
        
        // Check robot operation overlaps
        for (let i = 0; i < robotOps.length - 1; i++) {
          if (robotOps[i].endTime > robotOps[i + 1].startTime) {
            conflicts.push(`Robot: ${robotOps[i].action} (${formatTime(robotOps[i].startTime)}-${formatTime(robotOps[i].endTime)}) overlaps with ${robotOps[i + 1].action} (${formatTime(robotOps[i + 1].startTime)}-${formatTime(robotOps[i + 1].endTime)})`);
          }
        }
        
        // Check station conflicts (load before unload or overlapping processing)
        Object.keys(stations).forEach(stationType => {
          for (let stationId = 1; stationId <= stations[stationType].count; stationId++) {
            const stationTasks = scheduleData
              .filter(t => t.type === stationType && t.stationId === stationId)
              .sort((a, b) => a.startTime - b.startTime);
            
            for (let i = 0; i < stationTasks.length - 1; i++) {
              const current = stationTasks[i];
              const next = stationTasks[i + 1];
              
              // Check if station is occupied when next task starts
              if (current.action !== 'unload' && current.endTime > next.startTime) {
                conflicts.push(`${stations[stationType].name} Station ${stationId}: ${current.action} (${formatTime(current.startTime)}-${formatTime(current.endTime)}) overlaps with ${next.action} (${formatTime(next.startTime)}-${formatTime(next.endTime)})`);
              }
              
              // Check load-before-unload rule
              if (current.action === 'load' && next.action === 'load') {
                conflicts.push(`${stations[stationType].name} Station ${stationId}: Load scheduled before previous unload at ${formatTime(next.startTime)}`);
              }
            }
          }
        });
        
        return conflicts.length > 0 ? (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-semibold text-red-800 mb-2">⚠️ Scheduling Conflicts Detected:</h4>
            <ul className="text-sm text-red-700 space-y-1">
              {conflicts.map((conflict, index) => (
                <li key={index}>• {conflict}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-800">✅ No Conflicts - Schedule is Valid!</h4>
            <p className="text-sm text-green-700 mt-1">
              • Robot performs one operation at a time<br/>
              • Each station processes one tray at a time<br/>
              • Unload completes before next load on same station<br/>
              • Stations process independently and simultaneously
            </p>
          </div>
        );
      })()}
    </div>
  );
};

export default RobotSchedulerGantt;