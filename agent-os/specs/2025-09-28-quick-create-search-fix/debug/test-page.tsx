"use client";

import React from "react";
import FocusTestComponent from "./focus-test";

/**
 * Test Page for Quick Create Focus Issue Investigation
 *
 * This page provides an isolated environment to reproduce and debug
 * the focus loss issue in the Quick Create board search input.
 *
 * To use this test page:
 * 1. Import this component into a test route
 * 2. Open browser dev tools console
 * 3. Follow the test instructions on the page
 * 4. Monitor console logs for focus events and re-renders
 */
export const QuickCreateFocusTestPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Quick Create Focus Issue Debug
          </h1>
          <p className="text-gray-600">
            Isolated test environment to reproduce and analyze the search input focus loss
          </p>
        </div>

        <FocusTestComponent />

        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">Expected Issue:</h3>
          <p className="text-yellow-700 text-sm mb-2">
            When typing in the search input, focus should be lost after the first character,
            requiring the user to click back into the input to continue typing.
          </p>

          <h3 className="font-semibold text-yellow-800 mb-2 mt-4">What to Monitor:</h3>
          <ul className="text-yellow-700 text-sm space-y-1">
            <li>• Console logs showing focus/blur events</li>
            <li>• Component re-render frequency</li>
            <li>• State update timing</li>
            <li>• Event propagation behavior</li>
          </ul>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">Debug Console Logs Legend:</h3>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>• 🔄 = Component re-render</li>
            <li>• 🎯 = Input focus events</li>
            <li>• 😵 = Input blur events</li>
            <li>• ⌨️ = Keyboard/input events</li>
            <li>• 🖱️ = Mouse click events</li>
            <li>• 🔍 = Search query changes</li>
            <li>• 📋 = Board filtering results</li>
            <li>• 📂 = Select dropdown state changes</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default QuickCreateFocusTestPage;