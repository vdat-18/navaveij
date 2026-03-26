# Context — Biomarker Trend Graph Enhancements

**Date:** 2026-03-23

## Background

The "Trend & Timeline" drawer features a `BiomarkerTrendGrid` component, displaying line charts for historical lab results (e.g., Fasting Blood Sugar, HDL Cholesterol). These charts help doctors quickly assess whether a patient's health metrics are improving or deteriorating over time.

## The UX Issue

Previously, the `<LineChart>` component rendered a uniform visualization:
1. Every data point was represented by identical small teal dots.
2. The reference/threshold line was a thin dashed red line.
3. The chart footer just stated raw numbers (e.g., `Now: 109 mg/dL`, `Ref: 130`).

This required physicians to mentally calculate and interpret whether the most recent value was "good" or "bad" compared to the reference, increasing cognitive load during fast-paced consultations.

## Objective

Enhance the `BiomarkerTrendGrid` to provide immediate, visual semantic meaning to the data points, ensuring abnormal values and thresholds are impossible to miss.