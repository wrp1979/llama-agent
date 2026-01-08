#pragma once

#include "subagent-types.h"

#include <atomic>
#include <mutex>
#include <string>

// Manages nested visual output for subagent execution
class subagent_display {
public:
    // RAII class for managing a subagent display scope
    class scope {
    public:
        scope(subagent_display & display,
              const std::string & name,
              subagent_type type,
              const std::string & description);
        ~scope();

        // Prevent copying
        scope(const scope &) = delete;
        scope & operator=(const scope &) = delete;

        // Report a tool call within this subagent
        void report_tool_call(const std::string & tool_name,
                              const std::string & args_summary,
                              int elapsed_ms);

        // Report completion with timing
        void report_done(int elapsed_ms);

    private:
        subagent_display & display_;
        int depth_;
        bool done_reported_ = false;
    };

    // Get singleton instance
    static subagent_display & instance();

    // Current nesting depth (0 = main agent)
    int depth() const { return depth_.load(); }

    // Check if subagents can be spawned (depth < max_depth)
    bool can_spawn() const { return depth_.load() < max_depth_; }

    // Set max depth (default 1)
    void set_max_depth(int d) { max_depth_ = d; }

    // Get max depth
    int max_depth() const { return max_depth_; }

private:
    subagent_display() = default;

    std::mutex mtx_;
    std::atomic<int> depth_{0};
    int max_depth_ = 1;

    // Print tree characters for current depth
    void print_header(int depth, const std::string & icon, const std::string & name,
                      const std::string & type_name, const std::string & description);
    void print_tool_call(int depth, const std::string & tool_name,
                         const std::string & args_summary, int elapsed_ms);
    void print_done(int depth, int elapsed_ms);

    friend class scope;
};

// Helper: generate indentation prefix for given depth
std::string subagent_indent_prefix(int depth);
