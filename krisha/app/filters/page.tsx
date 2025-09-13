// app/filters/page.tsx
'use client'
import { useState, useEffect } from 'react';
import { Search, Home, Filter, MapPin, Building, Eye, Download, Loader } from 'lucide-react';

interface ApartmentCard {
    id: string;
    uuid: string;
    title: string;
    price: string;
    area: string;
    floor: string;
    address: string;
    description: string;
    views: string;
    imageUrl: string;
    url: string;
    isUrgent: boolean;
    features: string[];
}

interface FilterParams {
    city: string;
    district?: string;
    priceFrom: string;
    priceTo: string;
    rooms: string;
    areaFrom?: string;
    areaTo?: string;
    kitchenAreaFrom?: string;
    kitchenAreaTo?: string;
    floorFrom?: string;
    floorTo?: string;
    floorNotFirst?: boolean;
    floorNotLast?: boolean;
    houseFloorFrom?: string;
    houseFloorTo?: string;
    yearFrom?: string;
    yearTo?: string;
    houseType?: string;
    whoType?: string;
    hasPhoto?: boolean;
    complex?: string;
    page: number;
    collectAllPages?: boolean;
    maxResults?: number;
}

interface ApiResponse {
    apartments: ApartmentCard[];
    total: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
    url: string;
    filters: FilterParams;
    error?: string;
    isAllPagesMode?: boolean;
    imageStats?: {
        withImages: number;
        withoutImages: number;
    };
}

export default function FiltersPage() {
    const defaultFilters: FilterParams = {
        city: 'almaty',
        district: '',
        priceFrom: '10000000',
        priceTo: '50000000',
        rooms: '1',
        areaFrom: '50',
        areaTo: '70',
        kitchenAreaFrom: '',
        kitchenAreaTo: '',
        floorFrom: '1',
        floorTo: '12',
        floorNotFirst: true,
        floorNotLast: true,
        houseFloorFrom: '1',
        houseFloorTo: '12',
        yearFrom: '1985',
        yearTo: '2024',
        houseType: '',
        whoType: '',
        hasPhoto: true,
        complex: '',
        page: 1
    };

    const [filters, setFilters] = useState<FilterParams>(defaultFilters);

    const [apartments, setApartments] = useState<ApartmentCard[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [totalFound, setTotalFound] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [collectAllPages, setCollectAllPages] = useState(false);
    const [maxResults, setMaxResults] = useState(200);
    const [isAllPagesMode, setIsAllPagesMode] = useState(false);

    // Загрузка сохраненных фильтров из localStorage
    useEffect(() => {
        try {
            const savedFilters = localStorage.getItem('krisha-filters');
            if (savedFilters) {
                const parsed = JSON.parse(savedFilters);
                setFilters({ ...defaultFilters, ...parsed, page: 1 }); // Всегда сбрасываем на 1 страницу
            }
        } catch (error) {
            console.warn('Ошибка загрузки сохраненных фильтров:', error);
        }
    }, []);

    // Сохранение фильтров в localStorage при изменении
    useEffect(() => {
        try {
            const filtersToSave = { ...filters };
            delete filtersToSave.page; // Не сохраняем страницу
            localStorage.setItem('krisha-filters', JSON.stringify(filtersToSave));
        } catch (error) {
            console.warn('Ошибка сохранения фильтров:', error);
        }
    }, [filters]);

    // Функция для создания пресетов
    const savePreset = (name: string) => {
        try {
            const presets = JSON.parse(localStorage.getItem('krisha-presets') || '{}');
            const filtersToSave = { ...filters };
            delete filtersToSave.page;
            presets[name] = filtersToSave;
            localStorage.setItem('krisha-presets', JSON.stringify(presets));
        } catch (error) {
            console.warn('Ошибка сохранения пресета:', error);
        }
    };

    // Функция для загрузки пресета
    const loadPreset = (name: string) => {
        try {
            const presets = JSON.parse(localStorage.getItem('krisha-presets') || '{}');
            if (presets[name]) {
                setFilters({ ...presets[name], page: 1 });
            }
        } catch (error) {
            console.warn('Ошибка загрузки пресета:', error);
        }
    };

    // Функция для получения списка пресетов
    const getPresetNames = (): string[] => {
        try {
            const presets = JSON.parse(localStorage.getItem('krisha-presets') || '{}');
            return Object.keys(presets);
        } catch (error) {
            return [];
        }
    };

    const [presetNames] = useState<string[]>(getPresetNames());
    const [showPresetModal, setShowPresetModal] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');

    const cities = [
        { value: 'almaty', label: 'Алматы' },
        { value: 'astana', label: 'Астана' },
        { value: 'shymkent', label: 'Шымкент' },
    ];

    const districts = [
        { value: '', label: 'Все районы' },
        { value: 'bostandykskiy', label: 'Бостандыкский р-н' },
        { value: 'almalinsky', label: 'Алмалинский р-н' },
        { value: 'medeusky', label: 'Медеуский р-н' },
        { value: 'turksibsky', label: 'Турксибский р-н' },
        { value: 'alatausky', label: 'Алатауский р-н' },
        { value: 'jetysusky', label: 'Жетысуский р-н' },
        { value: 'nauryzbaysky', label: 'Наурызбайский р-н' },
        { value: 'auezovsky', label: 'Ауэзовский р-н' },
    ];

    const houseTypes = [
        { value: '', label: 'Не важно' },
        { value: '1', label: 'Панельный' },
        { value: '2', label: 'Кирпичный' },
        { value: '3', label: 'Монолитный' },
        { value: '4', label: 'Блочный' },
        { value: '5', label: 'Деревянный' },
    ];

    const whoTypes = [
        { value: '', label: 'Все типы' },
        { value: '1', label: 'От хозяев' },
        { value: '2', label: 'От агентств' },
    ];

    const roomOptions = [
        { value: '1', label: '1-комнатная' },
        { value: '2', label: '2-комнатная' },
        { value: '3', label: '3-комнатная' },
        { value: '4', label: '4-комнатная' },
        { value: '5', label: '5+ комнат' },
    ];

    const validateFilters = (): string[] => {
        const errors: string[] = [];

        if (!filters.city) {
            errors.push('Обязательно выбрать город');
        }

        // Проверяем диапазон цен
        const priceFrom = parseInt(filters.priceFrom);
        const priceTo = parseInt(filters.priceTo);
        if (priceFrom && priceTo && priceFrom > priceTo) {
            errors.push('Цена "от" не может быть больше цены "до"');
        }
        if (priceFrom && priceFrom < 0) {
            errors.push('Цена не может быть отрицательной');
        }

        // Проверяем диапазон общей площади
        const areaFrom = parseFloat(filters.areaFrom || '');
        const areaTo = parseFloat(filters.areaTo || '');
        if (areaFrom && areaTo && areaFrom > areaTo) {
            errors.push('Площадь "от" не может быть больше площади "до"');
        }
        if (areaFrom && areaFrom < 1) {
            errors.push('Площадь должна быть положительной');
        }

        // Проверяем диапазон площади кухни
        const kitchenFrom = parseFloat(filters.kitchenAreaFrom || '');
        const kitchenTo = parseFloat(filters.kitchenAreaTo || '');
        if (kitchenFrom && kitchenTo && kitchenFrom > kitchenTo) {
            errors.push('Площадь кухни "от" не может быть больше "до"');
        }

        // Проверяем этажи
        const floorFrom = parseInt(filters.floorFrom || '');
        const floorTo = parseInt(filters.floorTo || '');
        if (floorFrom && floorTo && floorFrom > floorTo) {
            errors.push('Этаж "от" не может быть больше этажа "до"');
        }
        if (floorFrom && floorFrom < 1) {
            errors.push('Этаж должен быть положительным');
        }

        // Проверяем этажность дома
        const houseFloorFrom = parseInt(filters.houseFloorFrom || '');
        const houseFloorTo = parseInt(filters.houseFloorTo || '');
        if (houseFloorFrom && houseFloorTo && houseFloorFrom > houseFloorTo) {
            errors.push('Этажность дома "от" не может быть больше "до"');
        }

        // Проверяем годы постройки
        const yearFrom = parseInt(filters.yearFrom || '');
        const yearTo = parseInt(filters.yearTo || '');
        const currentYear = new Date().getFullYear();
        if (yearFrom && yearTo && yearFrom > yearTo) {
            errors.push('Год "от" не может быть больше года "до"');
        }
        if (yearFrom && (yearFrom < 1900 || yearFrom > currentYear + 5)) {
            errors.push(`Некорректный год постройки (1900-${currentYear + 5})`);
        }

        return errors;
    };

    const handleSearch = async (resetPage: boolean = true) => {
        const errors = validateFilters();
        setValidationErrors(errors);

        if (errors.length > 0) {
            setError('Пожалуйста, исправьте ошибки в форме');
            return;
        }

        setLoading(true);
        setError('');
        setValidationErrors([]);

        // При новом поиске сбрасываем на первую страницу
        let searchFilters = resetPage ? { ...filters, page: 1 } : filters;

        // Добавляем параметры для сбора всех страниц
        if (collectAllPages) {
            searchFilters = {
                ...searchFilters,
                collectAllPages: true,
                maxResults: maxResults,
                page: 1 // Всегда начинаем с первой страницы при сборе всех
            };
        }

        if (resetPage) {
            setCurrentPage(1);
            setFilters(prev => ({ ...prev, page: 1 }));
        }

        try {
            const response = await fetch('/api/parse-filters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(searchFilters)
            });

            const result: ApiResponse = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Ошибка при парсинге');
            }

            setApartments(result.apartments);
            setTotalFound(result.total);
            setCurrentPage(result.currentPage || searchFilters.page);
            setTotalPages(result.totalPages || 1); // Используем totalPages из API
            setHasNextPage(result.hasNextPage || false);
            setIsAllPagesMode(result.isAllPagesMode || false);

            console.log(`Получено из API: всего объявлений=${result.total}, страниц=${result.totalPages}, текущая=${result.currentPage}`);

            if (result.isAllPagesMode) {
                console.log(`Режим сбора всех страниц: собрано ${result.apartments.length} объявлений`);
                if (result.imageStats) {
                    console.log(`Статистика изображений: ${result.imageStats.withImages} с фото, ${result.imageStats.withoutImages} без фото`);
                }
            }

        } catch (err) {
            console.error('Search error:', err);
            setError(err instanceof Error ? err.message : 'Ошибка при поиске объявлений');
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage < 1 || newPage > totalPages || loading) return;

        setFilters(prev => ({ ...prev, page: newPage }));
        setCurrentPage(newPage);

        // Запускаем поиск с новой страницей без сброса
        const newFilters = { ...filters, page: newPage };
        handleSearchWithFilters(newFilters);
    };

    const handleSearchWithFilters = async (searchFilters: FilterParams) => {
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/parse-filters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(searchFilters)
            });

            const result: ApiResponse = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Ошибка при парсинге');
            }

            setApartments(result.apartments);
            setTotalFound(result.total);
            setCurrentPage(result.currentPage || searchFilters.page);
            setTotalPages(result.totalPages || 1);
            setHasNextPage(result.hasNextPage || false);
            setIsAllPagesMode(result.isAllPagesMode || false);

            if (result.isAllPagesMode) {
                console.log(`Режим сбора всех страниц: собрано ${result.apartments.length} объявлений`);
                if (result.imageStats) {
                    console.log(`Статистика изображений: ${result.imageStats.withImages} с фото, ${result.imageStats.withoutImages} без фото`);
                }
            }

            // Прокручиваем к началу результатов при смене страницы
            const resultsSection = document.querySelector('#results-section');
            if (resultsSection) {
                resultsSection.scrollIntoView({ behavior: 'smooth' });
            }

        } catch (err) {
            console.error('Search error:', err);
            setError(err instanceof Error ? err.message : 'Ошибка при поиске объявлений');
        } finally {
            setLoading(false);
        }
    };

    const downloadResults = () => {
        const dataStr = JSON.stringify(apartments, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

        const exportFileDefaultName = `krisha_filters_${filters.city}_page_${currentPage}_${Date.now()}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    const formatPrice = (price: string) => {
        return price.replace(/\s+/g, ' ').trim();
    };

    // Генерируем диапазон страниц для отображения в пагинации
    const generatePageNumbers = () => {
        const pageNumbers: number[] = [];
        const maxVisiblePages = 7;

        if (totalPages <= maxVisiblePages) {
            // Если страниц мало, показываем все
            for (let i = 1; i <= totalPages; i++) {
                pageNumbers.push(i);
            }
        } else {
            // Показываем первую страницу
            pageNumbers.push(1);

            // Показываем страницы вокруг текущей
            const start = Math.max(2, currentPage - 2);
            const end = Math.min(totalPages - 1, currentPage + 2);

            if (start > 2) {
                pageNumbers.push(-1); // Символ "..."
            }

            for (let i = start; i <= end; i++) {
                if (i !== 1 && i !== totalPages) {
                    pageNumbers.push(i);
                }
            }

            if (end < totalPages - 1) {
                pageNumbers.push(-1); // Символ "..."
            }

            // Показываем последнюю страницу
            if (totalPages > 1) {
                pageNumbers.push(totalPages);
            }
        }

        return pageNumbers;
    };

    const pageNumbers = generatePageNumbers();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                            <Filter className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Фильтры Krisha.kz</h1>
                            <p className="text-sm text-gray-600">Поиск и анализ объявлений по параметрам</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Search Filters */}
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
                        <Search className="w-6 h-6 text-blue-600" />
                        <span>Параметры поиска</span>
                    </h2>

                    {/* Основные параметры */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Основные параметры</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Город */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Город
                                </label>
                                <select
                                    value={filters.city}
                                    onChange={(e) => setFilters({...filters, city: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    disabled={loading}
                                >
                                    {cities.map(city => (
                                        <option key={city.value} value={city.value}>
                                            {city.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Район */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Район
                                </label>
                                <select
                                    value={filters.district || ''}
                                    onChange={(e) => setFilters({...filters, district: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    disabled={loading}
                                >
                                    {districts.map(district => (
                                        <option key={district.value} value={district.value}>
                                            {district.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Комнаты */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Количество комнат
                                </label>
                                <select
                                    value={filters.rooms}
                                    onChange={(e) => setFilters({...filters, rooms: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    disabled={loading}
                                >
                                    {roomOptions.map(room => (
                                        <option key={room.value} value={room.value}>
                                            {room.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Тип объявления */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Тип объявления
                                </label>
                                <select
                                    value={filters.whoType || ''}
                                    onChange={(e) => setFilters({...filters, whoType: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    disabled={loading}
                                >
                                    {whoTypes.map(type => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Цена */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Цена</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Цена от */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Цена от (тенге)
                                </label>
                                <input
                                    type="number"
                                    value={filters.priceFrom}
                                    onChange={(e) => setFilters({...filters, priceFrom: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="10000000"
                                    disabled={loading}
                                />
                            </div>

                            {/* Цена до */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Цена до (тенге)
                                </label>
                                <input
                                    type="number"
                                    value={filters.priceTo}
                                    onChange={(e) => setFilters({...filters, priceTo: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="50000000"
                                    disabled={loading}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Площадь */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Площадь</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Общая площадь от */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Общая площадь от (м²)
                                </label>
                                <input
                                    type="number"
                                    value={filters.areaFrom || ''}
                                    onChange={(e) => setFilters({...filters, areaFrom: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="50"
                                    disabled={loading}
                                />
                            </div>

                            {/* Общая площадь до */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Общая площадь до (м²)
                                </label>
                                <input
                                    type="number"
                                    value={filters.areaTo || ''}
                                    onChange={(e) => setFilters({...filters, areaTo: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="70"
                                    disabled={loading}
                                />
                            </div>

                            {/* Площадь кухни от */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Площадь кухни от (м²)
                                </label>
                                <input
                                    type="number"
                                    value={filters.kitchenAreaFrom || ''}
                                    onChange={(e) => setFilters({...filters, kitchenAreaFrom: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="8"
                                    disabled={loading}
                                />
                            </div>

                            {/* Площадь кухни до */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Площадь кухни до (м²)
                                </label>
                                <input
                                    type="number"
                                    value={filters.kitchenAreaTo || ''}
                                    onChange={(e) => setFilters({...filters, kitchenAreaTo: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="15"
                                    disabled={loading}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Этажность */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Этажность</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Этаж от */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Этаж от
                                </label>
                                <input
                                    type="number"
                                    value={filters.floorFrom || ''}
                                    onChange={(e) => setFilters({...filters, floorFrom: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="1"
                                    min="1"
                                    disabled={loading}
                                />
                            </div>

                            {/* Этаж до */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Этаж до
                                </label>
                                <input
                                    type="number"
                                    value={filters.floorTo || ''}
                                    onChange={(e) => setFilters({...filters, floorTo: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="12"
                                    min="1"
                                    disabled={loading}
                                />
                            </div>

                            {/* Этажей в доме от */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Этажей в доме от
                                </label>
                                <input
                                    type="number"
                                    value={filters.houseFloorFrom || ''}
                                    onChange={(e) => setFilters({...filters, houseFloorFrom: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="1"
                                    min="1"
                                    disabled={loading}
                                />
                            </div>

                            {/* Этажей в доме до */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Этажей в доме до
                                </label>
                                <input
                                    type="number"
                                    value={filters.houseFloorTo || ''}
                                    onChange={(e) => setFilters({...filters, houseFloorTo: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="12"
                                    min="1"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {/* Чекбоксы для этажей */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="floorNotFirst"
                                    checked={filters.floorNotFirst || false}
                                    onChange={(e) => setFilters({...filters, floorNotFirst: e.target.checked})}
                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                    disabled={loading}
                                />
                                <label htmlFor="floorNotFirst" className="text-sm font-medium text-gray-700">
                                    Не первый этаж
                                </label>
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="floorNotLast"
                                    checked={filters.floorNotLast || false}
                                    onChange={(e) => setFilters({...filters, floorNotLast: e.target.checked})}
                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                    disabled={loading}
                                />
                                <label htmlFor="floorNotLast" className="text-sm font-medium text-gray-700">
                                    Не последний этаж
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Характеристики дома */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Характеристики дома</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Тип дома */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Тип дома
                                </label>
                                <select
                                    value={filters.houseType || ''}
                                    onChange={(e) => setFilters({...filters, houseType: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    disabled={loading}
                                >
                                    {houseTypes.map(type => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Год постройки от */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Год постройки от
                                </label>
                                <input
                                    type="number"
                                    value={filters.yearFrom || ''}
                                    onChange={(e) => setFilters({...filters, yearFrom: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="1985"
                                    min="1900"
                                    max="2024"
                                    disabled={loading}
                                />
                            </div>

                            {/* Год постройки до */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Год постройки до
                                </label>
                                <input
                                    type="number"
                                    value={filters.yearTo || ''}
                                    onChange={(e) => setFilters({...filters, yearTo: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="2024"
                                    min="1900"
                                    max="2024"
                                    disabled={loading}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Дополнительно */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Дополнительно</h3>
                        <div className="flex items-center space-x-6">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="hasPhoto"
                                    checked={filters.hasPhoto || false}
                                    onChange={(e) => setFilters({...filters, hasPhoto: e.target.checked})}
                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                    disabled={loading}
                                />
                                <label htmlFor="hasPhoto" className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                                    <Eye className="w-4 h-4" />
                                    <span>Только с фото</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Опции сбора всех страниц */}
                    <div className="pt-4 border-t border-gray-200">
                        <div className="flex flex-col space-y-3 mb-4">
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={collectAllPages}
                                    onChange={(e) => setCollectAllPages(e.target.checked)}
                                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                    Собрать все страницы результатов (до {maxResults} объявлений)
                                </span>
                            </label>

                            {collectAllPages && (
                                <div className="flex items-center space-x-3 ml-7">
                                    <label className="text-sm text-gray-600">Лимит результатов:</label>
                                    <select
                                        value={maxResults}
                                        onChange={(e) => setMaxResults(Number(e.target.value))}
                                        className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    >
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                        <option value={150}>150</option>
                                        <option value={200}>200</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => handleSearch()}
                                disabled={loading}
                                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 flex items-center space-x-2 font-medium disabled:opacity-50 shadow-lg"
                            >
                                {loading ? (
                                    <>
                                        <Loader className="w-5 h-5 animate-spin" />
                                        <span>Поиск...</span>
                                    </>
                                ) : (
                                    <>
                                        <Search className="w-5 h-5" />
                                        <span>Найти объявления</span>
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => {
                                    setFilters(defaultFilters);
                                    setApartments([]);
                                    setTotalFound(0);
                                    setCurrentPage(1);
                                    setError('');
                                    setValidationErrors([]);
                                }}
                                disabled={loading}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                Сбросить фильтры
                            </button>

                            <button
                                onClick={() => setShowPresetModal(true)}
                                disabled={loading}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                            >
                                <span>💾</span>
                                <span>Сохранить пресет</span>
                            </button>
                        </div>

                        {apartments.length > 0 && (
                            <button
                                onClick={downloadResults}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
                            >
                                <Download className="w-4 h-4" />
                                <span>Скачать результаты</span>
                            </button>
                        )}
                    </div>

                    {/* Пресеты */}
                    {presetNames.length > 0 && (
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <h4 className="text-sm font-medium text-blue-900 mb-2">Сохраненные пресеты:</h4>
                            <div className="flex flex-wrap gap-2">
                                {presetNames.map(name => (
                                    <button
                                        key={name}
                                        onClick={() => loadPreset(name)}
                                        disabled={loading}
                                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                                    >
                                        {name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {(error || validationErrors.length > 0) && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                            {error && (
                                <p className="text-red-700 font-medium mb-2">{error}</p>
                            )}
                            {validationErrors.length > 0 && (
                                <ul className="text-red-700 text-sm space-y-1">
                                    {validationErrors.map((err, index) => (
                                        <li key={index} className="flex items-start space-x-2">
                                            <span className="text-red-500 mt-0.5">•</span>
                                            <span>{err}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>

                {/* Results Summary */}
                {totalFound > 0 && (
                    <div id="results-section" className="bg-white rounded-lg shadow-md p-4 mb-6">
                        <div className="flex items-center justify-between">
                            <p className="text-gray-600">
                                Найдено объявлений: <span className="font-semibold text-gray-900">{totalFound.toLocaleString()}</span>
                                <span className="text-sm text-gray-500 ml-2">
                                    {isAllPagesMode
                                        ? `(собрано со всех страниц, отображается ${apartments.length})`
                                        : `(страница ${currentPage} из ${totalPages})`
                                    }
                                </span>
                            </p>

                            {apartments.length > 0 && (
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                    <span>На странице: {apartments.length}</span>
                                    <button
                                        onClick={downloadResults}
                                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
                                    >
                                        <Download className="w-4 h-4" />
                                        <span>Скачать страницу</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* All Pages Mode Info */}
                {isAllPagesMode && apartments.length > 0 && (
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 mb-6 border border-green-200">
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <p className="text-green-800 font-medium">
                                Режим сбора всех страниц активен - показаны все найденные объявления ({apartments.length} из {totalFound.toLocaleString()})
                            </p>
                        </div>
                        <p className="text-sm text-green-600 mt-2">
                            Пагинация отключена. Все результаты отображаются на одной странице.
                        </p>
                    </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && !loading && !isAllPagesMode && (
                    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Назад
                                </button>

                                <div className="flex items-center space-x-1">
                                    {pageNumbers.map((pageNum, index) => {
                                        if (pageNum === -1) {
                                            return <span key={index} className="px-2 text-gray-500">...</span>;
                                        }

                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => handlePageChange(pageNum)}
                                                className={`px-3 py-2 border rounded-lg transition-colors ${
                                                    pageNum === currentPage
                                                        ? 'bg-blue-600 text-white border-blue-600'
                                                        : 'border-gray-300 hover:bg-gray-50'
                                                }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages || !hasNextPage}
                                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Вперед
                                </button>
                            </div>

                            <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-600">Перейти на страницу:</span>
                                <input
                                    type="number"
                                    min="1"
                                    max={totalPages}
                                    value={currentPage}
                                    onChange={(e) => {
                                        const page = parseInt(e.target.value);
                                        if (page >= 1 && page <= totalPages) {
                                            handlePageChange(page);
                                        }
                                    }}
                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                                />
                                <span className="text-sm text-gray-500">из {totalPages}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Results Grid */}
                {apartments.length > 0 && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                            {apartments.map((apartment) => (
                                <div key={apartment.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-200">
                                    {/* Image */}
                                    <div className="relative">
                                        {apartment.imageUrl ? (
                                            <img
                                                src={apartment.imageUrl}
                                                alt={apartment.title}
                                                className="w-full h-48 object-cover"
                                                onError={(e) => {
                                                    // Если изображение не загрузилось, показываем заглушку
                                                    const target = e.target as HTMLImageElement;
                                                    target.style.display = 'none';
                                                    const placeholder = target.nextElementSibling as HTMLElement;
                                                    if (placeholder) {
                                                        placeholder.style.display = 'flex';
                                                    }
                                                }}
                                            />
                                        ) : null}
                                        {/* Заглушка для случая когда нет imageUrl или изображение не загрузилось */}
                                        <div
                                            className="w-full h-48 bg-gray-200 flex items-center justify-center"
                                            style={{ display: apartment.imageUrl ? 'none' : 'flex' }}
                                        >
                                            <div className="text-center">
                                                <Building className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                                <p className="text-sm text-gray-500">Нет фото</p>
                                            </div>
                                        </div>

                                        {apartment.isUrgent && (
                                            <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
                                                Срочно
                                            </div>
                                        )}

                                        <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs flex items-center space-x-1">
                                            <Eye className="w-3 h-3" />
                                            <span>{apartment.views}</span>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-4">
                                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                                            {apartment.title}
                                        </h3>

                                        <div className="text-xl font-bold text-blue-600 mb-2">
                                            {formatPrice(apartment.price)}
                                        </div>

                                        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                                            <MapPin className="w-4 h-4" />
                                            <span className="line-clamp-1">{apartment.address}</span>
                                        </div>

                                        <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                                            {apartment.description}
                                        </p>

                                        {apartment.features.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mb-3">
                                                {apartment.features.slice(0, 3).map((feature, index) => (
                                                    <span key={index} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                                                        {feature}
                                                    </span>
                                                ))}
                                                {apartment.features.length > 3 && (
                                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                                        +{apartment.features.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        <a
                                            href={`https://krisha.kz${apartment.url}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block w-full text-center py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                        >
                                            Открыть на Krisha.kz
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Bottom Pagination */}
                        {totalPages > 1 && !isAllPagesMode && (
                            <div className="bg-white rounded-lg shadow-md p-4">
                                <div className="flex items-center justify-center">
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => handlePageChange(currentPage - 1)}
                                            disabled={currentPage === 1}
                                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            ← Назад
                                        </button>

                                        <div className="flex items-center space-x-1">
                                            {pageNumbers.map((pageNum, index) => {
                                                if (pageNum === -1) {
                                                    return <span key={index} className="px-2 text-gray-500">...</span>;
                                                }

                                                return (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => handlePageChange(pageNum)}
                                                        className={`px-3 py-2 border rounded-lg transition-colors ${
                                                            pageNum === currentPage
                                                                ? 'bg-blue-600 text-white border-blue-600'
                                                                : 'border-gray-300 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <button
                                            onClick={() => handlePageChange(currentPage + 1)}
                                            disabled={currentPage === totalPages || !hasNextPage}
                                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Вперед →
                                        </button>
                                    </div>
                                </div>

                                <div className="text-center mt-3 text-sm text-gray-600">
                                    Страница {currentPage} из {totalPages} • Всего найдено: {totalFound.toLocaleString()}
                                    {hasNextPage && currentPage === totalPages && (
                                        <span className="text-blue-600 ml-2">(есть ещё)</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Empty State */}
                {!loading && apartments.length === 0 && !error && (
                    <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                        <Home className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            Объявления не найдены
                        </h3>
                        <p className="text-gray-600">
                            Попробуйте изменить параметры поиска
                        </p>
                    </div>
                )}
            </div>

            {/* Модальное окно для сохранения пресета */}
            {showPresetModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Сохранить пресет фильтров</h3>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Название пресета
                            </label>
                            <input
                                type="text"
                                value={newPresetName}
                                onChange={(e) => setNewPresetName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Например: 2-комн. Бостандык"
                                autoFocus
                            />
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => {
                                    setShowPresetModal(false);
                                    setNewPresetName('');
                                }}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={() => {
                                    if (newPresetName.trim()) {
                                        savePreset(newPresetName.trim());
                                        setShowPresetModal(false);
                                        setNewPresetName('');
                                        // Обновляем список пресетов
                                        window.location.reload();
                                    }
                                }}
                                disabled={!newPresetName.trim()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                Сохранить
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}