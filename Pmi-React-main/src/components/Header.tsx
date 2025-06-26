import React from "react";
import { AppBar, Toolbar, Typography } from "@mui/material";
import "../styles/Header.css";

const Header = () => (
  <AppBar position="static" className="header">
    <Toolbar className="header-toolbar">
      <Typography variant="h6" className="header-title">
        <span className="header-title-black">Calcule</span>{" "}
        <span className="header-title-white">Fácil</span>
      </Typography>
    </Toolbar>
  </AppBar>
);

export default Header;