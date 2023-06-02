import { Box, Container, Typography } from '@mui/material';
import { Route, Link, Outlet, useParams } from 'react-router-dom';
import { appstateDispatch } from 'sharedui/hooks/useAppState';

import styles from './home.module.scss';
import { useEffect } from 'react';
import { useUser } from 'psnapi/users';
import { Row } from '@/components/RowColumn';
import useAuth from '@/../../shared/psnapi/src/useAuth';
import { AddWidget } from '@ps-next/ps-next-widgets';

/* eslint-disable-next-line */
export interface HomeProps {}

export function Home(props: HomeProps) {
  const auth = useAuth();
  const { data: user } = useUser();
  useEffect(() => {
    appstateDispatch({ type: 'title', data: 'Home - PSNext' });
  }, []);

  return (
    <div className={styles['container']}>
      <Outlet />
      <Container>
        <Row justifyContent={'center'}>
          <Typography variant="h1" component="div" gutterBottom>
            Welcome
          </Typography>
        </Row>
        <Row justifyContent={'center'}>
          <Typography variant="h4" gutterBottom component="div">
            PS Next (Our data driven fute...)
          </Typography>
        </Row>
        <AddWidget
          apiKey={auth.auth.accessToken ? auth.auth.accessToken : ''}
          apiurl="http://localhost:3000"
          filters={{
            maxDate: new Date().toISOString(),
            minDate: '2000-12-31T05:30:00.000Z',
            usergroups: 'org:Team',
          }}
          id="AW1"
        />
        {/* <Typography variant="h1" component="div" gutterBottom>
          h1. Heading
        </Typography>
        <Typography variant="h2" gutterBottom component="div">
          h2. Heading
        </Typography>
        <Typography variant="h3" gutterBottom component="div">
          h3. Heading
        </Typography>
        <Typography variant="h4" gutterBottom component="div">
          h4. Heading
        </Typography>
        <Typography variant="h5" gutterBottom component="div">
          h5. Heading
        </Typography>
        <Typography variant="h6" gutterBottom component="div">
          h6. Heading
        </Typography>
        <Typography variant="subtitle1" gutterBottom component="div">
          subtitle1. Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quos
          blanditiis tenetur
        </Typography>
        <Typography variant="subtitle2" gutterBottom component="div">
          subtitle2. Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quos
          blanditiis tenetur
        </Typography>
        <Typography variant="body1" gutterBottom>
          body1. Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quos
          blanditiis tenetur unde suscipit, quam beatae rerum inventore consectetur,
          neque doloribus, cupiditate numquam dignissimos laborum fugiat deleniti? Eum
          quasi quidem quibusdam.
        </Typography>
        <Typography variant="body2" gutterBottom>
          body2. Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quos
          blanditiis tenetur unde suscipit, quam beatae rerum inventore consectetur,
          neque doloribus, cupiditate numquam dignissimos laborum fugiat deleniti? Eum
          quasi quidem quibusdam.
        </Typography>
        <Typography variant="button" display="block" gutterBottom>
          button text
        </Typography>
        <Typography variant="caption" display="block" gutterBottom>
          caption text
        </Typography>
        <Typography variant="overline" display="block" gutterBottom>
          overline text
        </Typography> */}
      </Container>
    </div>
  );
}

export default Home;
