import React, { useState } from "react";
import "./dashboard.css";
import { useNavigate } from "react-router-dom";
import {
  BiSearch,
  BiPlus,
  BiDotsVerticalRounded,
  BiHome,
  BiInfoCircle,
  BiEnvelope,
  BiGroup,
  BiGridAlt,
  BiListUl,
  BiFolder,
  BiChevronRight,
  BiChevronLeft
} from "react-icons/bi";
interface WorkspaceItem {
  id: string;
  name: string;
  owner: string;
  date: string;
  icon: string;
}
import logoImg from "../Button/assets/inscribe.png"

const Dashboard: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!isSidebarCollapsed);
  };

  // Sample workspace data

  const navigate = useNavigate();

  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // Sample workspace data
  const yesterdayWorkspaces: WorkspaceItem[] = [
    {
      id: "1",
      name: "My Schedule",
      owner: "me",
      date: "Mar 8, 2023",
      icon: "sheet",
    },
  ];

  const earlierWorkspaces: WorkspaceItem[] = [
    {
      id: "2",
      name: "My Schedule",
      owner: "me",
      date: "Oct 14, 2024",
      icon: "sheet",
    },
  ];

  const toggleProfileDropdown = () => {
    setShowProfileDropdown(!showProfileDropdown);
  };

  const handleCreateNewWorkspace = () => {
    console.log("Creating new workspace...");

    // Add transition effect to the canvas
    const canvas = document.querySelector(".blank-canvas") as HTMLElement;
    if (canvas) {
      canvas.style.transition =
        "transform 0.3s ease-out, opacity 0.3s ease-out";
      canvas.style.transform = "scale(1.05)";
      canvas.style.opacity = "0.8";
    }

    // Delay navigation to allow the transition to complete
    setTimeout(() => {
      navigate("/home");
    }, 300);
  };

  const handleWorkspaceClick = (workspace: WorkspaceItem) => {
    console.log(`Opening workspace: ${workspace.name}`);
    // Add your functionality here
  };

  const handleWorkspaceActions = (
    e: React.MouseEvent,
    workspace: WorkspaceItem
  ) => {
    e.stopPropagation();
    console.log(`Opening actions for: ${workspace.name}`);
    // Show context menu or actions modal
  };

  const renderWorkspaceIcon = (type: string) => {
    if (type === "sheet") {
      return <div className="workspace-icon sheet-icon"></div>;
    }
    return <div className="workspace-icon default-icon"></div>;
  };

  return (
    <div className={`dashboard-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>

        

<div className="mobile-menu-button" onClick={toggleMobileMenu}>
        <div className={`hamburger ${isMobileMenuOpen ? 'open' : ''}`}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>

      {/* Sidebar */}
 <div className={`dashboard-sidebar ${isMobileMenuOpen ? 'open' : ''} ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="dashboard-logo">
          {!isSidebarCollapsed && <img src={logoImg} alt="Logo" />}
          {!isSidebarCollapsed && <span>Dashboard</span>}
        </div>
        <nav className="dashboard-nav">
          <ul>
            <li><a href="#" title="Home"><BiHome /> {!isSidebarCollapsed && <span>Home</span>}</a></li>
            <li><a href="#" title="About"><BiInfoCircle /> {!isSidebarCollapsed && <span>About</span>}</a></li>
            <li><a href="#" title="Contact Us"><BiEnvelope /> {!isSidebarCollapsed && <span>Contact Us</span>}</a></li>
            <li><a href="#" title="Follow Us"><BiGroup /> {!isSidebarCollapsed && <span>Follow Us</span>}</a></li>
          </ul>
        </nav>
        
        <div className="sidebar-toggle" onClick={toggleSidebar}>
          {isSidebarCollapsed ? <BiChevronRight /> : <BiChevronLeft />}
        </div>
      </div>
      {/* Main Content */}
      <div className="dashboard-main">
        <div className="dashboard-header">
          <div className="search-bar">
            <BiSearch />
            <input type="text" placeholder="Search" />
          </div>
          <div className="profile-section">
            <div className="profile-dropdown">
              <img
                src="/profile-placeholder.jpg"
                alt="Profile"
                className="profile-img"
                onClick={toggleProfileDropdown}
              />
              {showProfileDropdown && (
                <div className="dropdown-content">
                  <a href="#">My Profile</a>
                  <a href="#">Sign Out</a>
                  <a href="#">Follow Us</a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Canvas Section */}
        <div className="canvas-section">
          <h2>Start a new workspace</h2>
          <div className="blank-canvas" onClick={handleCreateNewWorkspace}>
            <BiPlus className="plus-icon" />
          </div>
        </div>

        {/* Recent Workspaces */}
        <div className="workspaces-section">
          <div className="workspace-header">
            <h3>Yesterday</h3>
            <div className="workspace-filters">
              <div className="filter-dropdown">
                <span>Owned by anyone</span>
                <span className="dropdown-arrow">▼</span>
              </div>
              <span>Last opened by me</span>
              <div className="view-options">
                <BiGridAlt />
                <BiListUl />
                <BiFolder />
              </div>
            </div>
          </div>

          {yesterdayWorkspaces.map((workspace) => (
            <div
              key={workspace.id}
              className="workspace-item"
              onClick={() => handleWorkspaceClick(workspace)}
            >
              {renderWorkspaceIcon(workspace.icon)}
              <div className="workspace-info">
                <span className="workspace-name">{workspace.name}</span>
                <span className="workspace-owner">{workspace.owner}</span>
              </div>
              <div className="workspace-date">{workspace.date}</div>
              <div
                className="workspace-actions"
                onClick={(e) => handleWorkspaceActions(e, workspace)}
              >
                <BiDotsVerticalRounded />
              </div>
            </div>
          ))}

          <div className="workspace-header earlier">
            <h3>Earlier</h3>
          </div>

          {earlierWorkspaces.map((workspace) => (
            <div
              key={workspace.id}
              className="workspace-item"
              onClick={() => handleWorkspaceClick(workspace)}
            >
              {renderWorkspaceIcon(workspace.icon)}
              <div className="workspace-info">
                <span className="workspace-name">{workspace.name}</span>
                <span className="workspace-owner">{workspace.owner}</span>
              </div>
              <div className="workspace-date">{workspace.date}</div>
              <div
                className="workspace-actions"
                onClick={(e) => handleWorkspaceActions(e, workspace)}
              >
                <BiDotsVerticalRounded />
              </div>
            </div>
          ))}
        </div>

        <div className="dashboard-footer">
          <p>To show again, go to Main menu &gt; Settings &gt; Templates</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
