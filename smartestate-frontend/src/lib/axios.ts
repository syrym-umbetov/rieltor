import axios from 'axios'

axios.defaults.baseURL = process.env.NEXT_PUBLIC_API_URL

axios.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})