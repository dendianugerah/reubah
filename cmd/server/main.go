package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/dendianugerah/reubah/internal/handlers"
	"github.com/gorilla/mux"
)

func main() {
	// Initialize logger
	logger := log.New(os.Stdout, "[REUBAH] ", log.LstdFlags|log.Lshortfile)

	// Create router and setup routes
	r := setupRouter()

	// Create server with timeouts and other configurations
	srv := &http.Server{
		Handler:        r,
		Addr:           getPort(),
		WriteTimeout:   15 * time.Second,
		ReadTimeout:    15 * time.Second,
		IdleTimeout:    60 * time.Second,
		MaxHeaderBytes: 1 << 20, // 1MB
	}

	// Channel to listen for errors coming from the listener.
	serverErrors := make(chan error, 1)

	// Start the server
	go func() {
		logger.Printf("Server starting on %s", srv.Addr)
		serverErrors <- srv.ListenAndServe()
	}()

	// Channel to listen for an interrupt or terminate signal from the OS.
	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM)

	// Blocking main and waiting for shutdown.
	select {
	case err := <-serverErrors:
		logger.Fatalf("Error starting server: %v", err)

	case sig := <-shutdown:
		logger.Printf("Start shutdown... \nSignal: %v", sig)

		// Give outstanding requests a deadline for completion.
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		// Asking listener to shut down and shed load.
		if err := srv.Shutdown(ctx); err != nil {
			logger.Printf("Graceful shutdown did not complete in %v : %v", 15*time.Second, err)
			if err := srv.Close(); err != nil {
				logger.Fatalf("Could not stop server gracefully : %v", err)
			}
		}
	}
}

func setupRouter() *mux.Router {
	r := mux.NewRouter()

	// Middleware for all routes
	r.Use(loggingMiddleware)
	r.Use(securityHeadersMiddleware)
	r.Use(recoveryMiddleware)

	// Serve static files with caching
	fileServer := http.FileServer(http.Dir("static"))
	r.PathPrefix("/static/").Handler(
		http.StripPrefix("/static/", fileServer),
	)

	// Routes
	r.HandleFunc("/", handlers.ShowUploadForm).Methods("GET")
	r.HandleFunc("/process", handlers.ProcessImage).Methods("POST")
	r.HandleFunc("/process/merge-pdf", handlers.MergePDF).Methods("POST")
	r.HandleFunc("/process/document", handlers.ConvertDocument).Methods("POST")

	return r
}

// Middleware functions
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf(
			"%s %s %s",
			r.Method,
			r.RequestURI,
			time.Since(start),
		)
	})
}

func securityHeadersMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-XSS-Protection", "1; mode=block")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		next.ServeHTTP(w, r)
	})
}

func recoveryMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log.Printf("panic: %+v", err)
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// func cacheMiddleware(next http.Handler) http.Handler {
// 	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
// 		w.Header().Set("Cache-Control", "public, max-age=31536000")
// 		next.ServeHTTP(w, r)
// 	})
// }

func getPort() string {
	if port := os.Getenv("PORT"); port != "" {
		return ":" + port
	}
	return ":8081"
}
