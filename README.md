# Subway of Budapest (Play Game from this link!: https://ashley-omy.github.io/subway-of-Budapest/)

## Overview

**Subway of Budapest** is a **single-player, web-based game** developed as a JavaScript assignment for the university course  
**Web Programming (IP-18fWPEG)**.

The game is inspired by the board game **Next Station London**, adapting its **core mechanics** into an **interactive web application** themed around the **Budapest metro network**.

**Original board game rules (English PDF):**  
https://blueorangegames.eu/wp-content/uploads/2023/05/NextStationLondon-Rules-EN.pdf

---

## Gameplay

**Subway of Budapest** is a **turn-based, single-player game** in which the player builds metro lines on a **grid-based map** by connecting stations under specific rules.

- Stations must be selected in a strict **FROM → TO** order
- Each turn allows the player to:
  - Draw cards
  - Place metro segments following predefined constraints
- The objective is to **maximize the final score** by:
  - Efficient line planning
  - District coverage
  - Railway connections
  - Junction creation

**Detailed game rules and symbols** can be viewed directly from the **start screen** of the game.

---

## Features

### User Interface
- Intuitive and user-friendly UI built using:
  - JavaScript event handlers
  - SVG-based line drawing
  - Canvas-like visual layering for stations and segments
- Clear visual feedback for:
  - Station selection
  - Valid and invalid moves

### Gameplay & Scoring
- Single-player gameplay with real-time **score tracking**
- **Performance comparison system**:
  - Final score and total play time are stored in `localStorage`
  - Previous results are displayed on the start screen
  - Players can compare their performance across multiple runs

---

## Technologies Used

- **HTML** – page structure and layout
- **CSS** – styling and responsive layout
- **JavaScript** – game logic, event handling, state management, SVG rendering

---

## Project Background

This project was created as part of a **university assignment** for the course  
**Web Programming (IP-18fWPEG)**.

The main objective was to demonstrate:
- Practical understanding of **JavaScript**
- **DOM manipulation**
- **Event-driven programming**
- Graphical rendering using **SVG**
- Designing a real-world-style web application

---

## Notes

- This project is intended **for educational purposes only**
- The original board game **Next Station London** is the intellectual property of its respective creators
- This web implementation is a **non-commercial, academic adaptation**
