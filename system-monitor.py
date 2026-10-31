"""Cross-platform desktop CPU, memory, disk, temperature, and alert monitor."""

from __future__ import annotations

import platform
import os
import time
import tkinter as tk
from tkinter import messagebox, ttk

import psutil


class ResourceMonitor:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("System Resource Monitor")
        self.root.geometry("640x520")
        self.root.minsize(520, 440)
        self.root.configure(bg="#f4f6f8")
        self.last_alert: dict[str, float] = {}
        self.root.protocol("WM_DELETE_WINDOW", self.close)
        self._build()
        self.root.after(700, self.refresh)

    def _build(self) -> None:
        style = ttk.Style(self.root)
        style.theme_use("clam")
        style.configure("TFrame", background="#f4f6f8")
        style.configure("Card.TFrame", background="white")
        style.configure("TLabel", background="#f4f6f8", foreground="#253142", font=("Segoe UI", 10))
        style.configure("Title.TLabel", font=("Segoe UI", 19, "bold"), foreground="#20342b")
        style.configure("Metric.TLabel", background="white", font=("Segoe UI", 15, "bold"))
        style.configure("Detail.TLabel", background="white", foreground="#728092")
        style.configure("Horizontal.TProgressbar", troughcolor="#e8edf0", background="#16856a")

        outer = ttk.Frame(self.root, padding=22)
        outer.pack(fill="both", expand=True)
        ttk.Label(outer, text="System Resource Monitor", style="Title.TLabel").pack(anchor="w")
        ttk.Label(outer, text=f"{platform.system()} · Refreshes every 2 seconds").pack(anchor="w", pady=(3, 16))

        self.metrics: dict[str, tuple[ttk.Label, ttk.Label, ttk.Progressbar]] = {}
        grid = ttk.Frame(outer)
        grid.pack(fill="x")
        for index, key in enumerate(("CPU", "Memory", "Disk")):
            card = ttk.Frame(grid, style="Card.TFrame", padding=15)
            card.grid(row=0, column=index, sticky="nsew", padx=(0 if index == 0 else 6, 0 if index == 2 else 6))
            grid.columnconfigure(index, weight=1)
            ttk.Label(card, text=key, style="Detail.TLabel").pack(anchor="w")
            value = ttk.Label(card, text="—", style="Metric.TLabel")
            value.pack(anchor="w", pady=(8, 5))
            bar = ttk.Progressbar(card, maximum=100, mode="determinate")
            bar.pack(fill="x")
            detail = ttk.Label(card, text="Waiting for first sample", style="Detail.TLabel", wraplength=160)
            detail.pack(anchor="w", pady=(7, 0))
            self.metrics[key] = (value, detail, bar)

        temperature = ttk.Frame(outer, style="Card.TFrame", padding=15)
        temperature.pack(fill="x", pady=14)
        ttk.Label(temperature, text="Temperature sensors", style="Detail.TLabel").pack(anchor="w")
        self.temperature_label = ttk.Label(temperature, text="Checking sensor availability…", style="Metric.TLabel")
        self.temperature_label.pack(anchor="w", pady=(7, 0))

        settings = ttk.Frame(outer)
        settings.pack(fill="x", pady=(4, 12))
        ttk.Label(settings, text="Alert when CPU exceeds").grid(row=0, column=0, sticky="w")
        self.cpu_limit = tk.IntVar(value=95)
        ttk.Spinbox(settings, from_=50, to=100, increment=1, width=5, textvariable=self.cpu_limit).grid(row=0, column=1, padx=(6, 14))
        ttk.Label(settings, text="Memory exceeds").grid(row=0, column=2, sticky="w")
        self.memory_limit = tk.IntVar(value=95)
        ttk.Spinbox(settings, from_=50, to=100, increment=1, width=5, textvariable=self.memory_limit).grid(row=0, column=3, padx=(6, 14))
        ttk.Label(settings, text="%").grid(row=0, column=4, sticky="w")

        self.status = ttk.Label(outer, text="Temperature reporting depends on operating-system and hardware support.", wraplength=580)
        self.status.pack(anchor="w", pady=(7, 0))
        ttk.Button(outer, text="Refresh now", command=self.refresh).pack(anchor="e", pady=(12, 0))

    def _notify(self, metric: str, value: float, limit: int) -> None:
        now = time.monotonic()
        if value < limit or now - self.last_alert.get(metric, 0) < 300:
            return
        self.last_alert[metric] = now
        self.root.bell()
        self.status.configure(text=f"Alert: {metric} is {value:.0f}% (threshold {limit}%).")
        self.root.after(0, lambda: messagebox.showwarning("Resource threshold exceeded", f"{metric} usage is {value:.0f}%.\nConfigured alert threshold: {limit}%.", parent=self.root))

    @staticmethod
    def _threshold(variable: tk.IntVar, default: int) -> int:
        try:
            return max(50, min(100, variable.get()))
        except (tk.TclError, ValueError):
            return default

    def refresh(self) -> None:
        try:
            cpu = psutil.cpu_percent(interval=None)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage(os.path.abspath(os.sep))
            readings = {"CPU": (cpu, f"{psutil.cpu_count(logical=True) or 0} logical cores"), "Memory": (memory.percent, f"{memory.used / (1024 ** 3):.1f} / {memory.total / (1024 ** 3):.1f} GB used"), "Disk": (disk.percent, f"{disk.used / (1024 ** 3):.1f} / {disk.total / (1024 ** 3):.1f} GB used")}
            for name, (percent, detail_text) in readings.items():
                value, detail, bar = self.metrics[name]
                value.configure(text=f"{percent:.0f}%")
                detail.configure(text=detail_text)
                bar.configure(value=percent)
            self._notify("CPU", cpu, self._threshold(self.cpu_limit, 95))
            self._notify("Memory", memory.percent, self._threshold(self.memory_limit, 95))
            self._refresh_temperatures()
            self.root.after(2000, self.refresh)
        except (OSError, ValueError, IndexError) as error:
            self.status.configure(text=f"Could not read system metrics: {error}")
            self.root.after(5000, self.refresh)

    def _refresh_temperatures(self) -> None:
        try:
            reader = getattr(psutil, "sensors_temperatures", None)
            sensors = reader() if reader else {}
        except OSError:
            sensors = {}
        values = [(sensor.label or group, sensor.current) for group, entries in sensors.items() for sensor in entries if sensor.current is not None]
        if values:
            self.temperature_label.configure(text=" · ".join(f"{name}: {temperature:.0f}°C" for name, temperature in values[:5]))
        else:
            self.temperature_label.configure(text="Not available on this system")

    def close(self) -> None:
        if messagebox.askyesno("Quit monitor", "Close the resource monitor?"):
            self.root.destroy()


def main() -> None:
    root = tk.Tk()
    ResourceMonitor(root)
    root.mainloop()


if __name__ == "__main__":
    main()
