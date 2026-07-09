import { StrictMode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import MyReviews from './MyReviews'
import { User } from '../../../shared/schema'

vi.mock('axios')
const mockedAxios = vi.mocked(axios)
const member = { id: '2', role: 'member', name: 'Bob', email: 'bob@example.com' } as User

describe('MyReviews', () => {
  afterEach(() => vi.clearAllMocks())

  it('loads safely in React Strict Mode without returning a Promise from its effect', async () => {
    mockedAxios.get.mockResolvedValue({ data: { reviews: [] } })
    const view = render(
      <StrictMode>
        <MyReviews user={member} token="token" />
      </StrictMode>
    )

    expect(await screen.findByText('Queue cleared')).toBeTruthy()
    await waitFor(() => expect(mockedAxios.get).toHaveBeenCalled())
    expect(() => view.unmount()).not.toThrow()
  })
})
