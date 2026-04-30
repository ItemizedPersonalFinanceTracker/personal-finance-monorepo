import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MantineProvider } from '@mantine/core'
import './index.css'
import RouterWrapper from './RouterWrapper.tsx'
import { store } from './store'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <RouterWrapper />
        </MantineProvider>
      </QueryClientProvider>
    </Provider>
  </StrictMode>,
)
