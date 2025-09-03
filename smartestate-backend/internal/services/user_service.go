// internal/services/user_service.go
package services

import (
	"errors"
	"gorm.io/gorm"
	"smartestate/internal/models"
)

type UserService struct {
	db *gorm.DB
}

func NewUserService(db *gorm.DB) *UserService {
	return &UserService{db: db}
}

func (s *UserService) Create(user *models.User) error {
	return s.db.Create(user).Error
}

func (s *UserService) GetByID(id string) (*models.User, error) {
	var user models.User
	err := s.db.Where("id = ?", id).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (s *UserService) GetByEmail(email string) (*models.User, error) {
	var user models.User
	err := s.db.Where("email = ?", email).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func (s *UserService) Update(id string, updates *models.User) error {
	return s.db.Model(&models.User{}).Where("id = ?", id).Updates(updates).Error
}

func (s *UserService) Delete(id string) error {
	return s.db.Where("id = ?", id).Delete(&models.User{}).Error
}
