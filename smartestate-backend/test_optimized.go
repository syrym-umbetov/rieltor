package main

import (
	"fmt"
	"log"
	"smartestate/internal/services"
)

func main() {
	// Создаем KrishaFilterService
	krishaService := services.NewKrishaFilterService()

	// Тестируем с 6 объявлениями чтобы проверить новый компактный формат
	filters := services.KrishaFilters{
		City:            "almaty",
		Rooms:           "2",
		PriceTo:         "40000000",
		HasPhoto:        false,
		CollectAllPages: true,
		MaxResults:      6, // Тест с 6 объектами
		Page:            1,
	}

	fmt.Printf("🔍 Тестируем оптимизированный формат карточек\n")

	result, err := krishaService.ParseWithFilters(filters)
	if err != nil {
		log.Fatalf("❌ Ошибка: %v", err)
	}

	fmt.Printf("✅ Найдено: %d объектов\n", len(result.Properties))

	// Тестируем AI форматирование (имитируем)
	fmt.Printf("\n📋 Пример компактных карточек:\n")

	for i := 0; i < len(result.Properties); i += 2 {
		fmt.Printf("| Квартира | Квартира |\n")
		fmt.Printf("|----------|----------|\n")
		fmt.Printf("| ")

		for j := 0; j < 2 && (i+j) < len(result.Properties); j++ {
			prop := result.Properties[i+j]

			cardContent := fmt.Sprintf("**☐ %d.** ", i+j+1)
			if len(prop.Images) > 0 {
				cardContent += fmt.Sprintf("![🏠](%s)<br>", prop.Images[0])
			}

			title := prop.Title
			if len(title) > 25 {
				title = title[:22] + "..."
			}
			cardContent += fmt.Sprintf("**%s**<br>", title)

			priceFormatted := "Не указана"
			if prop.Price > 0 {
				if prop.Price >= 1000000 {
					priceFormatted = fmt.Sprintf("%.0f млн", float64(prop.Price)/1000000)
				} else {
					priceFormatted = fmt.Sprintf("%d тыс", prop.Price/1000)
				}
			}
			cardContent += fmt.Sprintf("💰 **%s ₸** [🔗](link)", priceFormatted)

			fmt.Printf("%s", cardContent)

			if j == 0 && (i+j+1) < len(result.Properties) {
				fmt.Printf(" | ")
			}
		}

		if i+1 >= len(result.Properties) {
			fmt.Printf(" | ")
		}

		fmt.Printf(" |\n\n")
	}

	fmt.Printf("📊 Общий размер данных: ~%d символов на карточку\n", 200) // примерная оценка
}