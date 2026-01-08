#include "subagent-display.h"
#include "console.h"

#include <sstream>

// Tree drawing characters (UTF-8)
static const char * TREE_CORNER_TOP    = "\xE2\x94\x8C";  // ┌
static const char * TREE_VERTICAL      = "\xE2\x94\x82";  // │
static const char * TREE_TEE           = "\xE2\x94\x9C";  // ├
static const char * TREE_CORNER_BOTTOM = "\xE2\x94\x94";  // └
static const char * TREE_HORIZONTAL    = "\xE2\x94\x80";  // ─
static const char * ARROW_RIGHT        = "\xE2\x80\xBA";  // ›

std::string subagent_indent_prefix(int depth) {
    if (depth <= 0) {
        return "";
    }
    std::string prefix;
    for (int i = 0; i < depth; i++) {
        prefix += TREE_VERTICAL;
        prefix += "   ";
    }
    return prefix;
}

subagent_display & subagent_display::instance() {
    static subagent_display inst;
    return inst;
}

void subagent_display::print_header(int depth, const std::string & icon,
                                     const std::string & name,
                                     const std::string & type_name,
                                     const std::string & description) {
    std::string prefix = subagent_indent_prefix(depth);

    // Print: ┌── ⚡ name (type)
    console::log("\n%s%s%s%s ", prefix.c_str(), TREE_CORNER_TOP, TREE_HORIZONTAL, TREE_HORIZONTAL);
    console::log("%s ", icon.c_str());
    console::set_display(DISPLAY_TYPE_SUBAGENT);
    console::log("%s", name.c_str());
    console::set_display(DISPLAY_TYPE_RESET);
    console::set_display(DISPLAY_TYPE_REASONING);
    console::log(" (%s)\n", type_name.c_str());
    console::set_display(DISPLAY_TYPE_RESET);

    // Print description if provided
    if (!description.empty()) {
        console::log("%s%s   ", prefix.c_str(), TREE_VERTICAL);
        console::set_display(DISPLAY_TYPE_REASONING);
        console::log("%s\n", description.c_str());
        console::set_display(DISPLAY_TYPE_RESET);
    }
}

void subagent_display::print_tool_call(int depth, const std::string & tool_name,
                                        const std::string & args_summary,
                                        int elapsed_ms) {
    std::string prefix = subagent_indent_prefix(depth);

    // Print: │   ├─› tool_name args (timing)
    console::log("%s%s   %s%s%s ", prefix.c_str(), TREE_VERTICAL, TREE_TEE, TREE_HORIZONTAL, ARROW_RIGHT);
    console::set_display(DISPLAY_TYPE_INFO);
    console::log("%s", tool_name.c_str());
    console::set_display(DISPLAY_TYPE_RESET);

    if (!args_summary.empty()) {
        console::log(" %s", args_summary.c_str());
    }

    console::log(" ");
    console::set_display(DISPLAY_TYPE_REASONING);
    if (elapsed_ms < 1000) {
        console::log("(%dms)", elapsed_ms);
    } else {
        console::log("(%.1fs)", elapsed_ms / 1000.0);
    }
    console::set_display(DISPLAY_TYPE_RESET);
    console::log("\n");
}

void subagent_display::print_done(int depth, int elapsed_ms) {
    std::string prefix = subagent_indent_prefix(depth);

    // Print: │   └── done (timing)
    console::log("%s%s   %s%s%s ", prefix.c_str(), TREE_VERTICAL, TREE_CORNER_BOTTOM, TREE_HORIZONTAL, TREE_HORIZONTAL);
    console::set_display(DISPLAY_TYPE_INFO);
    console::log("done");
    console::set_display(DISPLAY_TYPE_RESET);

    if (elapsed_ms > 0) {
        console::log(" ");
        console::set_display(DISPLAY_TYPE_REASONING);
        if (elapsed_ms < 1000) {
            console::log("(%dms)", elapsed_ms);
        } else {
            console::log("(%.1fs)", elapsed_ms / 1000.0);
        }
        console::set_display(DISPLAY_TYPE_RESET);
    }
    console::log("\n");
}

// scope implementation

subagent_display::scope::scope(subagent_display & display,
                                const std::string & name,
                                subagent_type type,
                                const std::string & description)
    : display_(display)
{
    std::lock_guard<std::mutex> lock(display_.mtx_);
    depth_ = display_.depth_.fetch_add(1);

    const auto & config = get_subagent_config(type);
    display_.print_header(depth_, config.icon, name, config.name, description);
}

subagent_display::scope::~scope() {
    std::lock_guard<std::mutex> lock(display_.mtx_);
    display_.depth_.fetch_sub(1);

    if (!done_reported_) {
        display_.print_done(depth_, 0);
    }
}

void subagent_display::scope::report_tool_call(const std::string & tool_name,
                                                const std::string & args_summary,
                                                int elapsed_ms) {
    std::lock_guard<std::mutex> lock(display_.mtx_);
    display_.print_tool_call(depth_, tool_name, args_summary, elapsed_ms);
}

void subagent_display::scope::report_done(int elapsed_ms) {
    std::lock_guard<std::mutex> lock(display_.mtx_);
    display_.print_done(depth_, elapsed_ms);
    done_reported_ = true;
}
