import axios from "axios";

export const API = {
    properties: {
        list: (filters) => axios.get('/api/properties', { params: filters }),
        get: (id) => axios.get(`/api/properties/${id}`),
        create: (data) => axios.post('/api/properties', data),
        update: (id, data) => axios.put(`/api/properties/${id}`, data),
        delete: (id) => axios.delete(`/api/properties/${id}`)
    },

}

