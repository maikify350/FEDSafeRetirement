import { createRoot } from 'react-dom/client'
import VehicleReportTemplate from '@/components/reports/VehicleReportTemplate'
import type { Vehicle } from '@/views/fleet/VehiclesView'

export function printVehicle(vehicle: Vehicle) {
  // Create a hidden container for the print content
  const printContainer = document.createElement('div')
  printContainer.style.position = 'fixed'
  printContainer.style.top = '0'
  printContainer.style.left = '0'
  printContainer.style.width = '100%'
  printContainer.style.height = '100%'
  printContainer.style.backgroundColor = 'white'
  printContainer.style.zIndex = '99999'
  printContainer.style.overflow = 'auto'
  document.body.appendChild(printContainer)

  // Render the report template
  const root = createRoot(printContainer)
  root.render(<VehicleReportTemplate vehicle={vehicle} />)

  // Wait for React to render, then trigger print
  setTimeout(() => {
    window.print()

    // Clean up after printing
    setTimeout(() => {
      root.unmount()
      document.body.removeChild(printContainer)
    }, 100)
  }, 250)
}
