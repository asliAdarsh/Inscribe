import {createBrowserRouter, RouterProvider} from 'react-router-dom';
import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';  

import Home from '@/screens/home';
import LaunchPage from '@/screens/home/components/Launch/launch';
import LoginPage from './screens/home/components/Login/login';
import '@/index.css';

const paths = [
    {
        path: '/',
        element: <LaunchPage />,
    },
    {
        path: '/home',
        element: <Home />,
    },
    {
      path: '/login',
      element: <LoginPage />,
  },
];

const BrowserRouter = createBrowserRouter(paths);

const App = () => {
    return (
    <MantineProvider>
      <RouterProvider router={BrowserRouter}/>
    </MantineProvider>
    )
};  

export default App;