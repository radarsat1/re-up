import { StudyPlan, SessionRecord } from '../types';

export interface ExportData {
  version: number;
  type: 'full' | 'single_plan';
  timestamp: string;
  data: {
    studyPlans: StudyPlan[];
    sessionHistory: SessionRecord[];
  };
}

export const exportDataToFile = (exportData: ExportData, filename: string): void => {
  try {
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export data:', error);
    alert('An error occurred while exporting the data.');
  }
};

export const readDataFromFile = (file: File): Promise<ExportData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (typeof result !== 'string') {
          return reject(new Error('Failed to read file content.'));
        }
        const parsed = JSON.parse(result);
        
        // Basic validation to ensure it's our export format
        if (
          parsed.version === 1 &&
          (parsed.type === 'full' || parsed.type === 'single_plan') &&
          parsed.data &&
          Array.isArray(parsed.data.studyPlans) &&
          Array.isArray(parsed.data.sessionHistory)
        ) {
          resolve(parsed as ExportData);
        } else {
          reject(new Error('Invalid or corrupted import file format.'));
        }
      } catch (error) {
        reject(new Error('Failed to parse file. Make sure it is a valid JSON export from Re-up AI.'));
      }
    };
    reader.onerror = () => reject(new Error('Error reading file.'));
    reader.readAsText(file);
  });
};
