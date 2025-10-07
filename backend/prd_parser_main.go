package main

import (
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"regexp"
	"strings"
)

// PRDDocument represents the parsed PRD structure
type PRDDocument struct {
	Context string `json:"context"`
	PRD     string `json:"prd"`
}

// PRDParser handles parsing of PRD files
type PRDParser struct {
	content string
}

// NewPRDParser creates a new parser instance
func NewPRDParser(filePath string) (*PRDParser, error) {
	content, err := ioutil.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	return &PRDParser{
		content: string(content),
	}, nil
}

// Parse extracts context and PRD sections from the file
func (p *PRDParser) Parse() (*PRDDocument, error) {
	// Regular expressions to match context and PRD sections
	contextRegex := regexp.MustCompile(`(?s)<context>(.*?)</context>`)
	prdRegex := regexp.MustCompile(`(?s)<PRD>(.*?)</PRD>`)

	// Extract context section
	contextMatches := contextRegex.FindStringSubmatch(p.content)
	var context string
	if len(contextMatches) > 1 {
		context = strings.TrimSpace(contextMatches[1])
	}

	// Extract PRD section
	prdMatches := prdRegex.FindStringSubmatch(p.content)
	var prd string
	if len(prdMatches) > 1 {
		prd = strings.TrimSpace(prdMatches[1])
	}

	return &PRDDocument{
		Context: context,
		PRD:     prd,
	}, nil
}

// ExtractSections parses the PRD into different sections
func (p *PRDParser) ExtractSections() (map[string]string, error) {
	doc, err := p.Parse()
	if err != nil {
		return nil, err
	}

	sections := make(map[string]string)

	// Parse different sections from the PRD content
	content := doc.Context + "\n\n" + doc.PRD

	// Define section patterns (Go doesn't support lookahead, so we'll use a simpler approach)
	sectionPatterns := map[string]string{
		"overview":            `# Overview([\s\S]*?)(?:\n# |$)`,
		"core_features":       `# Core Features([\s\S]*?)(?:\n# |$)`,
		"user_experience":     `# User Experience([\s\S]*?)(?:\n# |$)`,
		"technical_arch":      `# Technical Architecture([\s\S]*?)(?:\n# |$)`,
		"development_roadmap":  `# Development Roadmap([\s\S]*?)(?:\n# |$)`,
		"dependency_chain":    `# Logical Dependency Chain([\s\S]*?)(?:\n# |$)`,
		"risks":              `# Risks and Mitigations([\s\S]*?)(?:\n# |$)`,
		"appendix":           `# Appendix([\s\S]*?)$`,
	}

	// Extract each section
	for sectionName, pattern := range sectionPatterns {
		regex := regexp.MustCompile(pattern)
		matches := regex.FindStringSubmatch(content)
		if len(matches) > 1 {
			sections[sectionName] = strings.TrimSpace(matches[1])
		}
	}

	return sections, nil
}

// ExtractAPIs extracts API endpoints from the PRD
func (p *PRDParser) ExtractAPIs() ([]string, error) {
	doc, err := p.Parse()
	if err != nil {
		return nil, err
	}

	// Regex to find API endpoints (HTTP method + path)
	apiRegex := regexp.MustCompile(`\* (GET|POST|PUT|DELETE|PATCH) (/[^\s\n]+)`)
	matches := apiRegex.FindAllStringSubmatch(doc.PRD, -1)

	var apis []string
	for _, match := range matches {
		if len(match) >= 3 {
			apis = append(apis, fmt.Sprintf("%s %s", match[1], match[2]))
		}
	}

	return apis, nil
}

// ExtractTechStack extracts technology stack information
func (p *PRDParser) ExtractTechStack() (map[string][]string, error) {
	doc, err := p.Parse()
	if err != nil {
		return nil, err
	}

	techStack := make(map[string][]string)

	// Extract backend technologies
	backendRegex := regexp.MustCompile(`(?s)- Backend:(.*?)(?=- Frontend:|$)`)
	backendMatches := backendRegex.FindStringSubmatch(doc.PRD)
	if len(backendMatches) > 1 {
		backend := extractTechnologies(backendMatches[1])
		techStack["backend"] = backend
	}

	// Extract frontend technologies
	frontendRegex := regexp.MustCompile(`(?s)- Frontend:(.*?)(?=## |$)`)
	frontendMatches := frontendRegex.FindStringSubmatch(doc.PRD)
	if len(frontendMatches) > 1 {
		frontend := extractTechnologies(frontendMatches[1])
		techStack["frontend"] = frontend
	}

	return techStack, nil
}

// extractTechnologies helper function to parse technology lists
func extractTechnologies(text string) []string {
	techRegex := regexp.MustCompile(`\* ([^\n]+)`)
	matches := techRegex.FindAllStringSubmatch(text, -1)

	var techs []string
	for _, match := range matches {
		if len(match) > 1 {
			tech := strings.TrimSpace(match[1])
			techs = append(techs, tech)
		}
	}

	return techs
}

// PrintSummary prints a summary of the parsed PRD
func (p *PRDParser) PrintSummary() error {
	sections, err := p.ExtractSections()
	if err != nil {
		return err
	}

	apis, err := p.ExtractAPIs()
	if err != nil {
		return err
	}

	techStack, err := p.ExtractTechStack()
	if err != nil {
		return err
	}

	fmt.Println("=== PRD PARSER SUMMARY ===")
	fmt.Println()

	// Print sections
	fmt.Println("📋 SECTIONS FOUND:")
	for name := range sections {
		fmt.Printf("  ✓ %s\n", strings.ReplaceAll(name, "_", " "))
	}
	fmt.Println()

	// Print APIs
	fmt.Println("🔗 API ENDPOINTS:")
	for _, api := range apis {
		fmt.Printf("  • %s\n", api)
	}
	fmt.Println()

	// Print tech stack
	fmt.Println("⚡ TECHNOLOGY STACK:")
	for category, techs := range techStack {
		fmt.Printf("  %s:\n", strings.Title(category))
		for _, tech := range techs {
			fmt.Printf("    • %s\n", tech)
		}
		fmt.Println()
	}

	return nil
}

func main() {
	// Parse command line arguments or use default
	filePath := "../.taskmaster/templates/example_prd.txt"
	if len(os.Args) > 1 {
		filePath = os.Args[1]
	}

	// Create parser
	parser, err := NewPRDParser(filePath)
	if err != nil {
		log.Fatalf("Error creating parser: %v", err)
	}

	// Print summary
	if err := parser.PrintSummary(); err != nil {
		log.Fatalf("Error parsing PRD: %v", err)
	}
}