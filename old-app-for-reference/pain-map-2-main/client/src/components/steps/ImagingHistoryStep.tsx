import React, { useState } from 'react';
import { useFormContext } from '../../context/FormContext';
import { Imaging } from '../../data/formData';
import { FormControl, InputLabel, Select, MenuItem, Checkbox, ListItemText, OutlinedInput, SelectChangeEvent, Theme, useTheme } from '@mui/material';

// Define spinal regions for the dropdown
const SPINAL_REGIONS = ['Cervical', 'Thoracic', 'Lumbar', 'Sacral', 'Coccygeal'];

// Define a type for individual upload statuses
type UploadStatus = {
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
};

const ImagingHistoryStep: React.FC = () => {
  const { formData, updateFormData, formSessionId } = useFormContext(); // Added formSessionId
  
  // Local state to manage upload status for each imaging item
  const initialUploadStatuses: UploadStatus[] = formData.imaging.map(() => ({
    isLoading: false,
    error: null,
    successMessage: null,
  }));
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>(initialUploadStatuses);

  const updateImagingField = (index: number, field: keyof Imaging, value: Imaging[keyof Imaging]) => {
    const updatedImaging = formData.imaging.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    );
    updateFormData({ imaging: updatedImaging });
  };
  
  const handleFileChange = async (index: number, file: File | undefined) => {
    if (!file) {
      // If file is cleared, also clear documentName and status
      updateImagingField(index, 'document', undefined);
      updateImagingField(index, 'documentName', undefined);
      setUploadStatuses(prev => prev.map((s, i) => i === index ? { isLoading: false, error: null, successMessage: null } : s));
      return;
    }

    // Update local file object for immediate feedback if needed, though we primarily care about documentName
    updateImagingField(index, 'document', file); 
    
    setUploadStatuses(prev => prev.map((s, i) => i === index ? { isLoading: true, error: null, successMessage: 'Uploading...' } : s));

    const payload = new FormData();
    payload.append('imagingFile', file);
    // The formSessionId is now sent as a query parameter, not in the body
    // payload.append('formSessionId', formSessionId); 

    try {
      // Pass formSessionId as a query parameter
      const response = await fetch(`/api/upload/imaging-file?formSessionId=${encodeURIComponent(formSessionId)}`, {
        method: 'POST',
        body: payload,
        // Headers are not typically needed for FormData with fetch, browser sets Content-Type
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Upload failed (Status: ${response.status})`);
      }
      
      updateImagingField(index, 'documentName', result.filePath); // Store the returned filename/path
      setUploadStatuses(prev => prev.map((s, i) => i === index ? { isLoading: false, error: null, successMessage: `Uploaded: ${file.name}` } : s));

    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown upload error.";
      console.error(`Error uploading file for imaging item ${index}:`, err);
      setUploadStatuses(prev => prev.map((s, i) => i === index ? { isLoading: false, error: message, successMessage: null } : s));
      // Optionally clear documentName if upload fails
      // updateImagingField(index, 'documentName', undefined); 
    }
  };

  const handlePermissionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormData({ imagingRecordsPermission: e.target.checked });
  };

  return (
    <div className="step-container w-full max-w-[1200px] mx-auto">
      <h2 className="form-title">Imaging History</h2>
      
      <div className="max-w-full">
        <p className="text-slate-700 dark:text-gray-300 mb-6">
          Please indicate which imaging studies you have had for your spine. For each study, provide the date and location if available.
        </p>

        {/* Desktop version - only show on md screens and above */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-100 dark:bg-gray-700">
                <th className="text-left py-3 px-2 font-semibold text-slate-700 dark:text-gray-200 border-b dark:border-gray-600 w-[15%]">Type of Study</th>
                <th className="text-center py-3 px-2 font-semibold text-slate-700 dark:text-gray-200 border-b dark:border-gray-600 w-[10%]">Had This?</th>
                <th className="text-left py-3 px-2 font-semibold text-slate-700 dark:text-gray-200 border-b dark:border-gray-600 w-[15%]">Radiology Clinic</th>
                <th className="text-left py-3 px-2 font-semibold text-slate-700 dark:text-gray-200 border-b dark:border-gray-600 w-[15%]">Date</th>
                <th className="text-left py-3 px-2 font-semibold text-slate-700 dark:text-gray-200 border-b dark:border-gray-600 w-[20%]">Spinal Regions</th>
                <th className="text-left py-3 px-2 font-semibold text-slate-700 dark:text-gray-200 border-b dark:border-gray-600 w-[25%]">Upload Document</th> 
              </tr>
            </thead>
            <tbody>
              {formData.imaging.map((image, index) => {
                const currentStatus = uploadStatuses[index] || { isLoading: false, error: null, successMessage: null };
                return (
                <tr key={index} className="border-b dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-700">
                  <td className="py-2 px-2 text-slate-800 dark:text-gray-200">{image.type}</td>
                  <td className="py-2 px-2 text-center">
                    <div className="flex justify-center space-x-4">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          className="h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-600 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700"
                          checked={image.hadStudy === true}
                          onChange={() => updateImagingField(index, 'hadStudy', true)}
                        />
                        <span className="ml-2 text-slate-700 dark:text-gray-300">Yes</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          className="h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-600 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700"
                          checked={image.hadStudy === false}
                          onChange={() => {
                            updateImagingField(index, 'hadStudy', false);
                            // Also clear related fields if "No" is selected
                            updateImagingField(index, 'clinic', '');
                            updateImagingField(index, 'date', '');
                            updateImagingField(index, 'spinalRegions', []);
                            updateImagingField(index, 'document', undefined);
                            updateImagingField(index, 'documentName', undefined);
                            setUploadStatuses(prev => prev.map((s, i) => i === index ? { isLoading: false, error: null, successMessage: null } : s));
                          }}
                        />
                        <span className="ml-2 text-slate-700 dark:text-gray-300">No</span>
                      </label>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {image.hadStudy && (
                      <input
                        type="text"
                        className="w-full px-3 py-1 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Clinic name"
                        value={image.clinic || ''}
                        onChange={(e) => updateImagingField(index, 'clinic', e.target.value)}
                      />
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {image.hadStudy && (
                      <input
                        type="date"
                        className="w-full px-3 py-1 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Select date"
                        value={image.date || ''}
                        onChange={(e) => updateImagingField(index, 'date', e.target.value)}
                      />
                    )}
                  </td>
                  <td className="py-2 px-2">
                    {image.hadStudy && (
                      <div className="relative">
                        <FormControl className="w-full">
                          <InputLabel 
                            id={`spinal-regions-label-${index}`}
                            shrink={true}
                            sx={{
                              color: 'var(--color-text-primary)',
                              '&.Mui-focused': {
                                color: 'var(--color-primary)'
                              }
                            }}
                          >
                            Spinal Regions
                          </InputLabel>
                          <Select
                            labelId={`spinal-regions-label-${index}`}
                            id={`spinal-regions-${index}`}
                            multiple
                            value={image.spinalRegions || []}
                            onChange={(e) => {
                              // Ensure we always save an array
                              const selectedValues = typeof e.target.value === 'string' 
                                ? [e.target.value] 
                                : Array.isArray(e.target.value) ? e.target.value : [];
                              console.log(`Updating spinal regions for ${image.type}:`, selectedValues);
                              updateImagingField(index, 'spinalRegions', selectedValues);
                              // Debug state after update
                              setTimeout(() => {
                                const currentImaging = formData.imaging[index];
                                console.log(`After update, spinal regions for ${image.type}:`, currentImaging?.spinalRegions);
                              }, 0);
                            }}
                            input={<OutlinedInput label="Spinal Regions" />}
                            displayEmpty
                            renderValue={(selected) => 
                            (selected as string[]).length > 0 
                              ? (selected as string[]).join(', ') 
                              : <span className="text-gray-500 dark:text-gray-400">Select spinal regions</span>
                          }
                            sx={{
                              backgroundColor: 'var(--color-bg-input)',
                              color: 'var(--color-text-primary)',
                              '.MuiSvgIcon-root': {
                                color: 'var(--color-text-primary)',
                              }
                            }}
                            MenuProps={{
                              PaperProps: {
                                sx: {
                                  backgroundColor: 'var(--color-bg-dropdown)',
                                  color: 'var(--color-text-primary)',
                                }
                              }
                            }}
                          >
                            {SPINAL_REGIONS.map((region) => (
                              <MenuItem 
                                key={region} 
                                value={region}
                                sx={{
                                  '&.MuiMenuItem-root': {
                                    backgroundColor: 'var(--color-bg-dropdown)',
                                  },
                                  '&.Mui-selected': {
                                    backgroundColor: 'var(--color-bg-selected)',
                                  },
                                  '&.Mui-selected:hover': {
                                    backgroundColor: 'var(--color-bg-selected-hover)',
                                  },
                                  '&:hover': {
                                    backgroundColor: 'var(--color-bg-hover)',
                                  }
                                }}
                              >
                                <Checkbox 
                                  checked={image.spinalRegions?.includes(region) || false} 
                                  sx={{
                                    color: 'var(--color-text-secondary)',
                                    '&.Mui-checked': {
                                      color: 'var(--color-primary)',
                                    }
                                  }}
                                />
                                <ListItemText 
                                  primary={region} 
                                  primaryTypographyProps={{
                                    sx: {
                                      color: 'var(--color-text-primary)'
                                    }
                                  }}
                                />
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    {image.hadStudy && (
                      <div>
                        <label htmlFor={`file-upload-${index}`} className="block text-sm font-medium mb-1">Upload Document</label>
                        <input
                          id={`file-upload-${index}`}
                          aria-label="Upload imaging document"
                          title="Upload imaging document"
                          type="file"
                          className="w-full text-sm text-slate-500 dark:text-gray-400
                            file:mr-2 file:py-1 file:px-3 file:text-xs
                            file:rounded-full file:border-0
                            file:font-semibold
                            file:bg-blue-50 file:text-blue-700
                            dark:file:bg-blue-900/50 dark:file:text-blue-200
                            hover:file:bg-blue-100 dark:hover:file:bg-blue-800/50
                            disabled:opacity-50 disabled:cursor-not-allowed"
                          onChange={(e) => handleFileChange(index, e.target.files ? e.target.files[0] : undefined)}
                          disabled={currentStatus.isLoading}
                        />
                        {currentStatus.isLoading && <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Uploading...</p>}
                        {currentStatus.error && <p className="text-xs text-red-600 dark:text-red-400 mt-1">Error: {currentStatus.error}</p>}
                        {currentStatus.successMessage && !currentStatus.isLoading && <p className="text-xs text-green-600 dark:text-green-400 mt-1">{currentStatus.successMessage}</p>}
                        {/* Display existing documentName if already uploaded and no current operation */}
                        {!currentStatus.isLoading && !currentStatus.error && !currentStatus.successMessage && image.documentName && (
                           <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">Uploaded: {image.documentName.split('-').slice(2).join('-') /* Show originalish name */}</p>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Mobile version - only show on smaller screens */}
        <div className="md:hidden">
          {formData.imaging.map((image, index) => {
            const currentStatus = uploadStatuses[index] || { isLoading: false, error: null, successMessage: null };
            
            return (
              <div key={index} className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="font-medium text-slate-900 dark:text-white text-lg mb-3">{image.type}</h3>
                
                <div className="mb-4">
                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Have you had this study?</div>
                  <div className="flex space-x-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                        checked={image.hadStudy === true}
                        onChange={() => updateImagingField(index, 'hadStudy', true)}
                      />
                      <span className="ml-2 text-slate-700 dark:text-gray-300">Yes</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                        checked={image.hadStudy === false}
                        onChange={() => {
                          updateImagingField(index, 'hadStudy', false);
                          updateImagingField(index, 'clinic', '');
                          updateImagingField(index, 'date', '');
                          updateImagingField(index, 'spinalRegions', []);
                          updateImagingField(index, 'document', undefined);
                          updateImagingField(index, 'documentName', undefined);
                          setUploadStatuses(prev => prev.map((s, i) => i === index ? { isLoading: false, error: null, successMessage: null } : s));
                        }}
                      />
                      <span className="ml-2 text-slate-700 dark:text-gray-300">No</span>
                    </label>
                  </div>
                </div>
                
                {image.hadStudy && (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`clinic-${index}`}>
                        Radiology Clinic
                      </label>
                      <input
                        id={`clinic-${index}`}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-gray-200"
                        placeholder="Enter clinic name"
                        value={image.clinic || ''}
                        onChange={(e) => updateImagingField(index, 'clinic', e.target.value)}
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`date-${index}`}>
                        Date
                      </label>
                      <input
                        id={`date-${index}`}
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-gray-200"
                        placeholder="Select date"
                        value={image.date || ''}
                        onChange={(e) => updateImagingField(index, 'date', e.target.value)}
                      />
                    </div>
                    
                    <div className="mb-4">
                      <FormControl className="w-full">
                        <InputLabel 
                          id={`mobile-spinal-regions-label-${index}`}
                          shrink={true}
                          sx={{
                            color: 'var(--color-text-primary)',
                            '&.Mui-focused': {
                              color: 'var(--color-primary)'
                            }
                          }}
                        >
                          Spinal Regions
                        </InputLabel>
                        <Select
                          labelId={`mobile-spinal-regions-label-${index}`}
                          id={`mobile-spinal-regions-${index}`}
                          multiple
                          displayEmpty
                          value={image.spinalRegions || []}
                          onChange={(e) => {
                            const selectedValues = typeof e.target.value === 'string' 
                              ? [e.target.value] 
                              : e.target.value;
                            updateImagingField(index, 'spinalRegions', selectedValues);
                          }}
                          input={<OutlinedInput label="Spinal Regions" />}
                          renderValue={(selected) => 
                            (selected as string[]).length > 0 
                              ? (selected as string[]).join(', ') 
                              : <span className="text-gray-500 dark:text-gray-400">Select spinal regions</span>
                          }
                          sx={{
                            backgroundColor: 'var(--color-bg-input)',
                            color: 'var(--color-text-primary)',
                            '.MuiSvgIcon-root': {
                              color: 'var(--color-text-primary)',
                            }
                          }}
                          MenuProps={{
                            PaperProps: {
                              sx: {
                                backgroundColor: 'var(--color-bg-dropdown)',
                                color: 'var(--color-text-primary)',
                              }
                            }
                          }}
                        >
                          {SPINAL_REGIONS.map((region) => (
                            <MenuItem 
                              key={region} 
                              value={region}
                              sx={{
                                '&.MuiMenuItem-root': {
                                  backgroundColor: 'var(--color-bg-dropdown)',
                                },
                                '&.Mui-selected': {
                                  backgroundColor: 'var(--color-bg-selected)',
                                },
                                '&.Mui-selected:hover': {
                                  backgroundColor: 'var(--color-bg-selected-hover)',
                                },
                                '&:hover': {
                                  backgroundColor: 'var(--color-bg-hover)',
                                }
                              }}
                            >
                              <Checkbox 
                                checked={image.spinalRegions?.includes(region) || false} 
                                sx={{
                                  color: 'var(--color-text-secondary)',
                                  '&.Mui-checked': {
                                    color: 'var(--color-primary)',
                                  }
                                }}
                              />
                              <ListItemText 
                                primary={region} 
                                primaryTypographyProps={{
                                  sx: {
                                    color: 'var(--color-text-primary)'
                                  }
                                }}
                              />
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </div>
                    
                    <div className="mb-2">
                      <label htmlFor={`mobile-file-upload-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Upload Document
                      </label>
                      <input
                        id={`mobile-file-upload-${index}`}
                        aria-label="Upload imaging document"
                        title="Upload imaging document"
                        type="file"
                        className="w-full text-sm text-slate-500 dark:text-gray-400
                          file:mr-2 file:py-1 file:px-3 file:text-xs
                          file:rounded-full file:border-0
                          file:font-semibold
                          file:bg-blue-50 file:text-blue-700
                          dark:file:bg-blue-900/50 dark:file:text-blue-200
                          hover:file:cursor-pointer hover:file:bg-blue-100
                          dark:hover:file:bg-blue-900"
                        onChange={(e) => handleFileChange(index, e.target.files?.[0])}
                      />
                      {currentStatus.isLoading && (
                        <div className="mt-2 text-sm text-blue-600 dark:text-blue-400">Uploading...</div>
                      )}
                      {currentStatus.error && (
                        <div className="mt-2 text-sm text-red-600 dark:text-red-400">{currentStatus.error}</div>
                      )}
                      {currentStatus.successMessage && (
                        <div className="mt-2 text-sm text-green-600 dark:text-green-400">{currentStatus.successMessage}</div>
                      )}
                      {image.documentName && !currentStatus.isLoading && !currentStatus.error && (
                        <div className="mt-2 text-sm text-green-600 dark:text-green-400">Document uploaded successfully</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-gray-200 mb-3">Request for Permission</h3>
          <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-md shadow">
            <div className="flex items-start">
              <input 
                type="checkbox" 
                id="imagingPermission" 
                className="mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-400 rounded"
                checked={formData.imagingRecordsPermission}
                onChange={handlePermissionChange}
              />
              <label htmlFor="imagingPermission" className="ml-3 block text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-tight">
                I give permission for the clinical team to request my previous imaging records from radiology providers.
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImagingHistoryStep;
