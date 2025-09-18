'use client'
import { useEffect, useState } from 'react';
import { Search, Home, MapPin, Calendar, Ruler, Building, Banknote, Info, Loader, Download, Image as ImageIcon, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

interface PropertyData {
  title: string;
  price: string;
  pricePerMeter?: string;
  city?: string;
  district?: string;
  area?: string;
  rooms?: string;
  floor?: string;
  buildingType?: string;
  yearBuilt?: string;
  description?: string;
  features?: string[];
  location: string;
  contact?: {
    name: string;
    phone?: string;
    type: string;
  };
  views?: string;
  postedDate?: string;
  images: string[];
  coordinates?: string;
  propertyId?: string;
  url?: string;
}

interface SearchFilters {
  priceMin: string;
  priceMax: string;
  areaMin: string;
  areaMax: string;
  rooms: string;
  city: string;
  page?: number;
}

export default function OlxParserInterface() {
  const [mode, setMode] = useState<'single' | 'filter'>('single');
  const [url, setUrl] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    priceMin: '',
    priceMax: '',
    areaMin: '',
    areaMax: '',
    rooms: '',
    city: 'almaty'
  });
  const [propertyData, setPropertyData] = useState<PropertyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchResults, setSearchResults] = useState<PropertyData[]>([]);
  const [pagination, setPagination] = useState<{
    currentPage: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }>({
    currentPage: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false
  });

  const parseProperty = async () => {
    if (!url.trim()) {
      setError('Введите ссылку на объявление');
      return;
    }

    if (!url.includes('olx.')) {
      setError('Ссылка должна быть с сайта OLX');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('Отправляем запрос на парсинг:', url);

      const response = await fetch('/api/parse-olx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      console.log('Ответ от API:', response.status, response.statusText);

      const result = await response.json();
      console.log('Данные от API получены, статус:', response.status);

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка при парсинге');
      }

      if (result.data) {
        setPropertyData(result.data);
        console.log('Данные установлены:', result.data?.title?.substring(0, 50), 'изображений:', result.data.images?.length || 0);
      }
    } catch (err) {
      console.error('Parsing error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка при парсинге объявления');
    } finally {
      setLoading(false);
    }
  };

  const searchByFilters = async (page: number = 1) => {
    setLoading(true);
    setError('');

    try {
      // Create a clean object with only serializable values
      const searchFilters = {
        priceMin: filters.priceMin || '',
        priceMax: filters.priceMax || '',
        areaMin: filters.areaMin || '',
        areaMax: filters.areaMax || '',
        rooms: filters.rooms || '',
        city: filters.city || 'almaty',
        page: page
      };

      const response = await fetch('/api/search-olx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters: searchFilters })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка при поиске');
      }

      setSearchResults(result.data?.properties || []);
      setPagination(result.data?.pagination || {
        currentPage: page,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
      });
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка при поиске объявлений');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    searchByFilters(newPage);
  };

  const downloadImage = async (imageUrl: string, filename: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Ошибка скачивания:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-orange-600 to-red-600 rounded-lg flex items-center justify-center">
              <Home className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Парсер OLX.kz</h1>
              <p className="text-sm text-gray-600">Анализ объявлений недвижимости</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Mode Selector */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Анализ объявлений с OLX.kz
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Парсинг отдельного объявления по ссылке или поиск по фильтрам
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="flex justify-center mb-8">
            <div className="bg-gray-100 rounded-xl p-1 flex">
              <button
                onClick={() => setMode('single')}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  mode === 'single'
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Search className="w-5 h-5 inline mr-2" />
                Парсинг по ссылке
              </button>
              <button
                onClick={() => setMode('filter')}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  mode === 'filter'
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Filter className="w-5 h-5 inline mr-2" />
                Поиск по фильтрам
              </button>
            </div>
          </div>

          {/* Single URL Mode */}
          {mode === 'single' && (
            <div className="max-w-2xl mx-auto">
              <div className="flex space-x-4">
                <div className="flex-1">
                  <input
                    type="url"
                    placeholder="https://olx.kz/d/obyavlenie/..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none text-lg"
                    disabled={loading}
                  />
                </div>
                <button
                  onClick={parseProperty}
                  disabled={loading}
                  className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:from-orange-700 hover:to-red-700 transition-all duration-200 flex items-center space-x-2 font-semibold disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Парсинг...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      <span>Анализировать</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Filter Search Mode */}
          {mode === 'filter' && (
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Цена от (тг)</label>
                  <input
                    type="number"
                    placeholder="10000000"
                    value={filters.priceMin}
                    onChange={(e) => setFilters({...filters, priceMin: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Цена до (тг)</label>
                  <input
                    type="number"
                    placeholder="25000000"
                    value={filters.priceMax}
                    onChange={(e) => setFilters({...filters, priceMax: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Комнат</label>
                  <select
                    value={filters.rooms}
                    onChange={(e) => setFilters({...filters, rooms: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none"
                  >
                    <option value="">Любое количество</option>
                    <option value="1">1 комната</option>
                    <option value="2">2 комнаты</option>
                    <option value="3">3 комнаты</option>
                    <option value="4+">4+ комнат</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Площадь от (м²)</label>
                  <input
                    type="number"
                    placeholder="30"
                    value={filters.areaMin}
                    onChange={(e) => setFilters({...filters, areaMin: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Площадь до (м²)</label>
                  <input
                    type="number"
                    placeholder="100"
                    value={filters.areaMax}
                    onChange={(e) => setFilters({...filters, areaMax: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Город</label>
                  <select
                    value={filters.city}
                    onChange={(e) => setFilters({...filters, city: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none"
                  >
                    <option value="almaty">Алматы</option>
                    <option value="astana">Астана</option>
                    <option value="shymkent">Шымкент</option>
                  </select>
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={() => searchByFilters()}
                  disabled={loading}
                  className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:from-orange-700 hover:to-red-700 transition-all duration-200 flex items-center space-x-2 font-semibold disabled:opacity-50 mx-auto"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Поиск...</span>
                    </>
                  ) : (
                    <>
                      <Filter className="w-5 h-5" />
                      <span>Найти объявления</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-center">{error}</p>
            </div>
          )}
        </div>

        {/* Single Property Results */}
        {propertyData && mode === 'single' && (
          <div className="space-y-8">
            {/* Main Info */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-6">
                <h2 className="text-2xl font-bold">{propertyData.title}</h2>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="text-3xl font-bold">{propertyData.price}</span>
                  {propertyData.pricePerMeter && (
                    <span className="text-lg opacity-90">({propertyData.pricePerMeter}/м²)</span>
                  )}
                </div>
              </div>

              <div className="p-6 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="text-sm text-gray-600">Расположение</p>
                    <p className="font-semibold">{propertyData.location || `${propertyData.city}, ${propertyData.district}`}</p>
                  </div>
                </div>

                {propertyData.area && (
                  <div className="flex items-center space-x-3">
                    <Ruler className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">Площадь</p>
                      <p className="font-semibold">{propertyData.area}</p>
                    </div>
                  </div>
                )}

                {propertyData.rooms && (
                  <div className="flex items-center space-x-3">
                    <Home className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">Комнаты</p>
                      <p className="font-semibold">{propertyData.rooms}</p>
                    </div>
                  </div>
                )}

                {propertyData.floor && (
                  <div className="flex items-center space-x-3">
                    <Building className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-sm text-gray-600">Этаж</p>
                      <p className="font-semibold">{propertyData.floor}</p>
                    </div>
                  </div>
                )}

                {propertyData.yearBuilt && (
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    <div>
                      <p className="text-sm text-gray-600">Год постройки</p>
                      <p className="font-semibold">{propertyData.yearBuilt}</p>
                    </div>
                  </div>
                )}

                {propertyData.contact && (
                  <div className="flex items-center space-x-3">
                    <Info className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="text-sm text-gray-600">Контакт</p>
                      <p className="font-semibold">{propertyData.contact.name}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Images Gallery */}
            {propertyData.images && propertyData.images.length > 0 && (
              <ImageGallery images={propertyData.images} title={propertyData.title} />
            )}

            {/* Description */}
            {propertyData.description && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Описание</h3>
                <p className="text-gray-700 leading-relaxed">{propertyData.description}</p>
              </div>
            )}

            {/* Features */}
            {propertyData.features && propertyData.features.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Особенности</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {propertyData.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2 p-3 bg-orange-50 rounded-lg">
                      <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && mode === 'filter' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  Найдено объявлений: {searchResults.length}
                </h3>
                <div className="text-sm text-gray-600">
                  Страница {pagination.currentPage}{pagination.totalPages > 1 && ` из ${pagination.totalPages}`}
                </div>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {searchResults.map((property, index) => (
                  <PropertyCard key={index} property={property} />
                ))}
              </div>
            </div>

            {/* Pagination */}
            <PaginationControls
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              hasNextPage={pagination.hasNextPage}
              hasPreviousPage={pagination.hasPreviousPage}
              onPageChange={handlePageChange}
              loading={loading}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Компонент пагинации
function PaginationControls({
  currentPage,
  totalPages,
  hasNextPage,
  hasPreviousPage,
  onPageChange,
  loading
}: {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange: (page: number) => void;
  loading: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <div className="flex items-center justify-center space-x-4">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPreviousPage || loading}
          className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Предыдущая</span>
        </button>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Страница</span>
          <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg font-semibold">
            {currentPage}
          </span>
          {totalPages > 1 && (
            <span className="text-sm text-gray-600">из {totalPages}</span>
          )}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage || loading}
          className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span>Следующая</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center mt-4">
          <Loader className="w-5 h-5 animate-spin text-orange-600" />
          <span className="ml-2 text-sm text-gray-600">Загрузка...</span>
        </div>
      )}
    </div>
  );
}

// Компонент карточки объявления
function PropertyCard({ property }: { property: PropertyData }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
      {property.images.length > 0 && (
        <img
          src={property.images[0]}
          alt={property.title}
          className="w-full h-48 object-cover"
        />
      )}
      <div className="p-4">
        <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2">{property.title}</h4>
        <p className="text-xl font-bold text-orange-600 mb-2">{property.price}</p>
        <div className="text-sm text-gray-600 space-y-1">
          <p>{property.location}</p>
          {property.area && <p>Площадь: {property.area}</p>}
          {property.rooms && <p>Комнаты: {property.rooms}</p>}
        </div>
      </div>
    </div>
  );
}

// Компонент галереи изображений
function ImageGallery({ images, title }: { images: string[]; title: string }) {
  const [currentImage, setCurrentImage] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="bg-gray-100 rounded-xl p-8 text-center">
        <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500">Изображения не найдены</p>
      </div>
    );
  }

  const downloadImage = async (imageUrl: string, filename: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Ошибка скачивания:', error);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
          <ImageIcon className="w-6 h-6 text-orange-600" />
          <span>Фотографии ({images.length})</span>
        </h3>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="relative">
          {/* Основное изображение */}
          <img
            src={images[currentImage]}
            alt={`Фото ${currentImage + 1} - ${title}`}
            className="w-full h-96 object-cover"
          />

          {/* Счетчик и кнопка скачивания */}
          <div className="absolute top-4 right-4 flex items-center space-x-2">
            <div className="bg-black bg-opacity-50 text-white px-3 py-1 rounded">
              {currentImage + 1} / {images.length}
            </div>
            <button
              onClick={() => downloadImage(images[currentImage], `${title}_photo_${currentImage + 1}.jpg`)}
              className="bg-black bg-opacity-50 text-white p-2 rounded hover:bg-opacity-70 transition-opacity"
              title="Скачать это изображение"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>

          {/* Навигация */}
          {images.length > 1 && (
            <>
              <button
                onClick={() => setCurrentImage(prev => prev > 0 ? prev - 1 : images.length - 1)}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white w-10 h-10 rounded-full hover:bg-opacity-70 transition-opacity"
              >
                ‹
              </button>
              <button
                onClick={() => setCurrentImage(prev => prev < images.length - 1 ? prev + 1 : 0)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white w-10 h-10 rounded-full hover:bg-opacity-70 transition-opacity"
              >
                ›
              </button>
            </>
          )}
        </div>

        {/* Превью */}
        {images.length > 1 && (
          <div className="p-4 flex gap-2 overflow-x-auto">
            {images.map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`Превью ${index + 1}`}
                className={`w-20 h-16 object-cover rounded cursor-pointer border-2 flex-shrink-0 ${
                  index === currentImage ? 'border-orange-500' : 'border-gray-200'
                }`}
                onClick={() => setCurrentImage(index)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}