import React from "react";
import "./App.css";
import { SharingResourcesExample } from "./tabs/SharingResources";
import { SynchronizationExample } from "./tabs/Synchronization";

const tabs = [
  {
    name: "Synchronized main thread with workers",
    view: () => <SynchronizationExample></SynchronizationExample>,
  },
  {
    name: "Multiple renderers per worker with shared resources",
    view: () => <SharingResourcesExample></SharingResourcesExample>,
  },
];

const App = () => {
  const [selectedTab, setSelectedTab] = React.useState(0);
  return (
    //switch
    <div className="app-container">
      <div className="app-tabs">
        {tabs.map((t, i) => (
          <button
            className="app-tab-button"
            key={i}
            onClick={() => setSelectedTab(i)}
          >
            {t.name}
          </button>
        ))}
      </div>
      <div className="app-viewer">{tabs[selectedTab].view()}</div>
    </div>
  );
};

export default App;
