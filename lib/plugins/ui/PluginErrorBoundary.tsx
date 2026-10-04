"use client";
import { Component, type ReactNode } from "react";

interface Props { pluginId: string; fallback: string; children: ReactNode }

export class PluginErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { console.error(`[PLUGIN_UI] ${this.props.pluginId}`, error); }
  render() {
    if (this.state.failed) return <p className="text-sm text-muted-foreground">{this.props.fallback}</p>;
    return this.props.children;
  }
}
