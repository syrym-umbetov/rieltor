// internal/api/handlers/auth_handler_swagger.go
package handlers

// Register godoc
// @Summary Register a new user
// @Description Register a new user account
// @Tags Authentication
// @Accept json
// @Produce json
// @Param request body RegisterRequest true "Registration data"
// @Success 201 {object} map[string]interface{} "User created successfully"
// @Failure 400 {object} map[string]interface{} "Bad Request"
// @Failure 409 {object} map[string]interface{} "User already exists"
// @Router /auth/register [post]

// Login godoc
// @Summary Login user
// @Description Login with email and password
// @Tags Authentication
// @Accept json
// @Produce json
// @Param request body LoginRequest true "Login credentials"
// @Success 200 {object} map[string]interface{} "Login successful with tokens"
// @Failure 401 {object} map[string]interface{} "Invalid credentials"
// @Router /auth/login [post]

// GetProfile godoc
// @Summary Get user profile
// @Description Get current user's profile information
// @Tags Authentication
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} models.User "User profile"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 404 {object} map[string]interface{} "User not found"
// @Router /auth/profile [get]
