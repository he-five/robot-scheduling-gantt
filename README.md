# Robot Scheduling Gantt Chart

An interactive Gantt chart visualization for robot scheduling operations with dedicated stations.

## Features

- 🏭 **12 Dedicated Stations** (6 Disk-pack + 6 Spacer-tray)
- 🤖 **Robot Operation Scheduling** with conflict-free operations
- 📊 **Interactive Gantt Chart** with zoom controls
- 🎨 **Color-coded Operations** (Load/Process/Unload)
- 📈 **Performance Statistics** and idle time analysis
- 📱 **Responsive Design** for desktop and mobile

## Technology Stack

- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Create React App** for build tooling

## Getting Started

### Prerequisites

- Node.js 18.x or 20.x LTS
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd robot-scheduling-gantt

# Install dependencies
npm install

# Start development server
npm start
```

### Building for Production

```bash
# Create production build
npm run build

# Files will be in the 'build' directory
```

## Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Netlify
```bash
npm run build
# Upload 'build' folder to netlify.com
```

### GitHub Pages
```bash
npm install --save-dev gh-pages
npm run deploy
```

## Configuration

The system parameters can be modified in `src/RobotScheduler.tsx`:

```typescript
const stations = {
  diskPack: {
    count: 6,           // Number of stations
    waitTime: 250,      // Processing time (seconds)
    loadTime: 12,       // Robot load time (seconds)
    unloadTime: 12,     // Robot unload time (seconds)
  },
  spacerTray: {
    count: 6,           // Number of stations
    waitTime: 125,      // Processing time (seconds)
    loadTime: 12,       // Robot load time (seconds)
    unloadTime: 12,     // Robot unload time (seconds)
  }
};
```

## Features Breakdown

### Station Operations
- **Dedicated Stations**: Each station type processes only its specific part type
- **Parallel Processing**: Multiple stations can process simultaneously
- **Conflict-Free**: No overlapping operations on the same station

### Robot Scheduling
- **Single Robot**: Handles all load/unload operations sequentially
- **Priority-Based**: Unloads completed stations before new loads
- **Optimized**: Minimizes station wait times

### Visual Features
- **Zoom Controls**: Adjust time scale for detailed analysis
- **Color Coding**: Different colors for load/unload/process operations
- **Interactive**: Hover tooltips with operation details
- **Responsive**: Works on desktop and mobile devices

## License

MIT License - feel free to use and modify as needed.
