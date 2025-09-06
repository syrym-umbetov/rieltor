/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverActions: {
            bodySizeLimit: '10mb',
            // Увеличиваем максимальную продолжительность для API routes с Selenium
            allowedOrigins: ['localhost:3000']
        }
    },
    // Для увеличения таймаута API routes используем Node.js переменные окружения
    env: {
        API_TIMEOUT: '300000' // 5 минут
    }
};

export default nextConfig;