#  QuantumDisaster AI

### Quantum-Inspired AI for Intelligent Disaster Response and Resource Allocation

## Overview

QuantumDisaster AI is a disaster-response decision-support prototype designed to help emergency coordinators prioritize affected zones and allocate limited emergency resources during disasters such as floods, fires, earthquakes, and cyclones.

The prototype combines risk scoring, resource allocation, route recommendations, and interactive simulations in a dashboard.

**Important:** This is a decision-support simulation. It does not predict real disasters, replace emergency authorities, or dispatch real emergency vehicles.

## ❗ Problem Statement

During disasters:
- Multiple zones may need assistance simultaneously.
- Ambulances, rescue teams, shelters, and medical supplies are limited.
- Each zone has different severity levels and population needs.
- Blocked roads and changing conditions complicate emergency planning.

Emergency coordinators need a way to compare priorities and explore resource-allocation options.

##  Proposed Solution

QuantumDisaster AI provides a simulated environment to:

- Assess and prioritize disaster-affected zones.
- Estimate risk and urgency using configurable scoring.
- Allocate limited resources across affected zones.
- Recommend routes using a route-optimization algorithm.
- Run disaster-response simulations.
- Explore what-if scenarios.
- Visualize recommendations and results through a dashboard.

## Key Features

- Disaster overview dashboard
- Incident management
- Interactive disaster map
- Resource management
- Emergency vehicle tracking simulation
- Route optimization
- Live simulation controls
- Analytics and priority scoring
- What-if scenario analysis

Feature availability depends on the current implementation.

##  Quantum-Inspired Approach

Resource allocation is a combinatorial optimization problem: several zones compete for limited emergency resources while response priorities and resource constraints must be considered.

This project explores quantum-inspired optimization concepts to help evaluate allocation choices.

The current prototype should be described according to the algorithm actually implemented. A classical or quantum-inspired simulation is not the same as execution on quantum hardware.

## Technology Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Recharts
- Lucide icons

Refer to `package.json` for the complete dependency list.

## Run Locally

### Prerequisites

- Node.js
- npm
- Git

### Installation

Clone the repository:

```bash
git clone https://github.com/vijayalakshmia2110-a/QuantumDisaster-AI-2026.git