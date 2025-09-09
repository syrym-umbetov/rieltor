import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'

export const API = {
    properties: {
        list: (filters) => axios.get(`${API_BASE_URL}/properties`, { params: filters }),
        get: (id) => axios.get(`${API_BASE_URL}/properties/${id}`),
        create: (data) => axios.post(`${API_BASE_URL}/properties`, data),
        update: (id, data) => axios.put(`${API_BASE_URL}/properties/${id}`, data),
        delete: (id) => axios.delete(`${API_BASE_URL}/properties/${id}`)
    },

}

