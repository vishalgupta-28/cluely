import React from 'react';
import { AppProvider } from "../../../context/AppContext"

const Layout = ({ children }) => {
    return (
        <AppProvider>


            {children}

        </AppProvider>
    );
};

export default Layout;