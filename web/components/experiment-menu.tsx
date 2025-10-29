'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ExperimentItem {
  type: string;
  title: string;
  description: string;
}

interface ExperimentCategory {
  title: string;
  description: string;
  tag: string;
  tagColor: string;
  experiments: ExperimentItem[];
}

interface ExperimentMenuProps {
  onSelectExperiment: (type: string, title: string, description: string) => void;
}

export function ExperimentMenu({ onSelectExperiment }: ExperimentMenuProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const categories: ExperimentCategory[] = [
    {
      title: 'Image Filters',
      description: 'Apply smoothing and noise reduction filters',
      tag: 'Processing',
      tagColor: 'bg-blue-100 text-blue-700',
      experiments: [
        { type: 'gaussian_blur', title: 'Gaussian Blur', description: 'Apply Gaussian smoothing filter' },
        { type: 'median_filter', title: 'Median Filter', description: 'Remove salt and pepper noise' },
        { type: 'bilateral_filter', title: 'Bilateral Filter', description: 'Edge-preserving smoothing' },
      ],
    },
    {
      title: 'Edge Detection',
      description: 'Detect boundaries and features',
      tag: 'Vision',
      tagColor: 'bg-green-100 text-green-700',
      experiments: [
        { type: 'sobel_edge', title: 'Sobel Edge Detection', description: 'Gradient-based edge detection' },
        { type: 'canny_edge', title: 'Canny Edge Detection', description: 'Multi-stage edge detection' },
        { type: 'laplacian_edge', title: 'Laplacian Edge Detection', description: 'Second derivative edge detection' },
      ],
    },
    {
      title: 'Histogram Equalization',
      description: 'Enhance contrast and brightness',
      tag: 'Enhancement',
      tagColor: 'bg-purple-100 text-purple-700',
      experiments: [
        { type: 'histogram_equalization', title: 'Histogram Equalization', description: 'Improve contrast by redistributing intensity values' },
      ],
    },
    {
      title: 'Morphological Operations',
      description: 'Shape-based image processing',
      tag: 'Morphology',
      tagColor: 'bg-orange-100 text-orange-700',
      experiments: [
        { type: 'morphology_erosion', title: 'Erosion', description: 'Shrink bright regions' },
        { type: 'morphology_dilation', title: 'Dilation', description: 'Expand bright regions' },
        { type: 'morphology_opening', title: 'Opening', description: 'Erosion followed by dilation' },
        { type: 'morphology_closing', title: 'Closing', description: 'Dilation followed by erosion' },
      ],
    },
    {
      title: 'Threshold Segmentation',
      description: 'Separate regions by intensity',
      tag: 'Segmentation',
      tagColor: 'bg-pink-100 text-pink-700',
      experiments: [
        { type: 'threshold_binary', title: 'Binary Threshold', description: 'Simple threshold segmentation' },
        { type: 'threshold_otsu', title: 'Otsu Threshold', description: 'Automatic threshold selection' },
        { type: 'threshold_adaptive', title: 'Adaptive Threshold', description: 'Local adaptive thresholding' },
      ],
    },
  ];

  const toggleCategory = (categoryTitle: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryTitle)) {
      newExpanded.delete(categoryTitle);
    } else {
      newExpanded.add(categoryTitle);
    }
    setExpandedCategories(newExpanded);
  };

  return (
    <div className="space-y-2">
      {categories.map((category) => {
        const isExpanded = expandedCategories.has(category.title);
        return (
          <div key={category.title} className="border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleCategory(category.title)}
              className="w-full text-left px-4 py-3 hover:bg-accent transition-colors flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="font-medium text-sm">{category.title}</div>
                  <span className={`text-xs px-2 py-1 rounded ${category.tagColor}`}>
                    {category.tag}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">{category.description}</div>
              </div>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
              )}
            </button>

            {isExpanded && category.experiments.length > 0 && (
              <div className="px-2 pb-2 space-y-1 bg-accent/50">
                {category.experiments.map((exp) => (
                  <button
                    key={exp.type}
                    onClick={() => onSelectExperiment(exp.type, exp.title, exp.description)}
                    className="w-full text-left px-3 py-2 rounded hover:bg-background transition-colors"
                  >
                    <div className="font-medium text-sm">{exp.title}</div>
                    <div className="text-xs text-muted-foreground">{exp.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
