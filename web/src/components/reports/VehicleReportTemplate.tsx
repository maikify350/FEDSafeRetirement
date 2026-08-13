'use client'

import { Vehicle } from '@/views/fleet/VehiclesView'
import { COLORS } from '../../theme/designTokens'


type Props = {
  vehicle: Vehicle
}

/**
 * PDF report template component for generating vehicle inspection/condition reports.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/components/reports/VehicleReportTemplate.tsx
 */
export default function VehicleReportTemplate({ vehicle }: Props) {
  return (
    <div className='print-template' style={{ padding: '20mm', fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ borderBottom: '2px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>{vehicle.name}</h1>
        <p style={{ margin: '5px 0', color: '#666' }}>Vehicle Specification Report</p>
      </div>

      {/* Basic Information */}
      <section style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '10px' }}>
          Vehicle Information
        </h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '8px 0', width: '30%', fontWeight: 'bold' }}>VIN / Serial Number:</td>
              <td style={{ padding: '8px 0' }}>{vehicle.vin || 'N/A'}</td>
            </tr>
            <tr>
              <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Vehicle Type:</td>
              <td style={{ padding: '8px 0' }}>{vehicle.vehicleType || 'N/A'}</td>
            </tr>
            <tr>
              <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Year / Make / Model:</td>
              <td style={{ padding: '8px 0' }}>
                {vehicle.year || 'N/A'} {vehicle.make || 'N/A'} {vehicle.model || 'N/A'}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '8px 0', fontWeight: 'bold' }}>License Plate:</td>
              <td style={{ padding: '8px 0' }}>{vehicle.licensePlate || 'N/A'}</td>
            </tr>
            <tr>
              <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Color:</td>
              <td style={{ padding: '8px 0' }}>{vehicle.color || 'N/A'}</td>
            </tr>
            <tr>
              <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Status:</td>
              <td style={{ padding: '8px 0' }}>{vehicle.status || 'N/A'}</td>
            </tr>
            <tr>
              <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Assigned To:</td>
              <td style={{ padding: '8px 0' }}>{vehicle.assignedToName || 'Not Assigned'}</td>
            </tr>
            <tr>
              <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Odometer / Usage:</td>
              <td style={{ padding: '8px 0' }}>
                {vehicle.usageReading ? `${vehicle.usageReading.toLocaleString()} ${vehicle.usageUnit || ''}` : 'N/A'}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Fuel Type:</td>
              <td style={{ padding: '8px 0' }}>{vehicle.fuelType || 'N/A'}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Service & Maintenance */}
      {(vehicle.inServiceDate || vehicle.lastServiceDate || vehicle.nextServiceDue || vehicle.estimatedServiceLifeMiles) && (
        <section style={{ marginBottom: '20px', pageBreakInside: 'avoid' }}>
          <h2 style={{ fontSize: '18px', borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '10px' }}>
            Service & Maintenance
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {vehicle.inServiceDate && (
                <tr>
                  <td style={{ padding: '8px 0', width: '30%', fontWeight: 'bold' }}>In-Service Date:</td>
                  <td style={{ padding: '8px 0' }}>{new Date(vehicle.inServiceDate).toLocaleDateString()}</td>
                </tr>
              )}
              {vehicle.lastServiceDate && (
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Last Service Date:</td>
                  <td style={{ padding: '8px 0' }}>{new Date(vehicle.lastServiceDate).toLocaleDateString()}</td>
                </tr>
              )}
              {vehicle.nextServiceDue && (
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Next Service Due:</td>
                  <td style={{ padding: '8px 0' }}>{new Date(vehicle.nextServiceDue).toLocaleDateString()}</td>
                </tr>
              )}
              {vehicle.serviceInterval && (
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Service Interval:</td>
                  <td style={{ padding: '8px 0' }}>{vehicle.serviceInterval.toLocaleString()} miles/hours</td>
                </tr>
              )}
              {vehicle.estimatedServiceLifeMiles && (
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Estimated Service Life:</td>
                  <td style={{ padding: '8px 0' }}>{vehicle.estimatedServiceLifeMiles.toLocaleString()} miles</td>
                </tr>
              )}
              {vehicle.estimatedResaleValue && (
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Estimated Resale Value:</td>
                  <td style={{ padding: '8px 0' }}>${vehicle.estimatedResaleValue.toLocaleString()}</td>
                </tr>
              )}
            </tbody>
          </table>
          {vehicle.maintenanceNotes && (
            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: COLORS.gray100, borderRadius: '4px' }}>
              <strong>Notes:</strong> {vehicle.maintenanceNotes}
            </div>
          )}
        </section>
      )}

      {/* Engine Specifications */}
      {(vehicle.engineType || vehicle.engineCylinders || vehicle.horsepower || vehicle.maxTorque) && (
        <section style={{ marginBottom: '20px', pageBreakInside: 'avoid' }}>
          <h2 style={{ fontSize: '18px', borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '10px' }}>
            Engine Specifications
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {vehicle.engineType && (
                <tr>
                  <td style={{ padding: '8px 0', width: '30%', fontWeight: 'bold' }}>Engine Type:</td>
                  <td style={{ padding: '8px 0' }}>{vehicle.engineType}</td>
                </tr>
              )}
              {vehicle.engineCylinders && (
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Cylinders:</td>
                  <td style={{ padding: '8px 0' }}>{vehicle.engineCylinders}</td>
                </tr>
              )}
              {vehicle.engineDisplacement && (
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Displacement:</td>
                  <td style={{ padding: '8px 0' }}>{vehicle.engineDisplacement}L</td>
                </tr>
              )}
              {vehicle.engineValves && (
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Valves:</td>
                  <td style={{ padding: '8px 0' }}>{vehicle.engineValves}</td>
                </tr>
              )}
              {vehicle.horsepower && (
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Horsepower:</td>
                  <td style={{ padding: '8px 0' }}>{vehicle.horsepower} hp</td>
                </tr>
              )}
              {vehicle.maxTorque && (
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Max Torque:</td>
                  <td style={{ padding: '8px 0' }}>{vehicle.maxTorque} lb-ft</td>
                </tr>
              )}
              {vehicle.aspirationType && (
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Aspiration:</td>
                  <td style={{ padding: '8px 0' }}>{vehicle.aspirationType}</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      {/* Transmission & Drivetrain */}
      {(vehicle.transmissionType || vehicle.driveType) && (
        <section style={{ marginBottom: '20px', pageBreakInside: 'avoid' }}>
          <h2 style={{ fontSize: '18px', borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '10px' }}>
            Transmission & Drivetrain
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {vehicle.transmissionType && (
                <tr>
                  <td style={{ padding: '8px 0', width: '30%', fontWeight: 'bold' }}>Transmission Type:</td>
                  <td style={{ padding: '8px 0' }}>{vehicle.transmissionType}</td>
                </tr>
              )}
              {vehicle.transmissionSpeeds && (
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Speeds:</td>
                  <td style={{ padding: '8px 0' }}>{vehicle.transmissionSpeeds}</td>
                </tr>
              )}
              {vehicle.transmissionDescription && (
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Description:</td>
                  <td style={{ padding: '8px 0' }}>{vehicle.transmissionDescription}</td>
                </tr>
              )}
              {vehicle.driveType && (
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Drive Type:</td>
                  <td style={{ padding: '8px 0' }}>{vehicle.driveType}</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      {/* Performance & Capacity */}
      {(vehicle.cityMpg || vehicle.gvwr || vehicle.towingCapacity) && (
        <section style={{ marginBottom: '20px', pageBreakInside: 'avoid' }}>
          <h2 style={{ fontSize: '18px', borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '10px' }}>
            Performance & Capacity
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {vehicle.cityMpg && (
                <tr>
                  <td style={{ padding: '8px 0', width: '30%', fontWeight: 'bold' }}>Fuel Economy (City/Hwy):</td>
                  <td style={{ padding: '8px 0' }}>
                    {vehicle.cityMpg}/{vehicle.highwayMpg} MPG
                    {vehicle.combinedMpg && ` (${vehicle.combinedMpg} combined)`}
                  </td>
                </tr>
              )}
              {vehicle.tankCapacity && (
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Tank Capacity:</td>
                  <td style={{ padding: '8px 0' }}>{vehicle.tankCapacity} gallons</td>
                </tr>
              )}
              {vehicle.gvwr && (
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>GVWR:</td>
                  <td style={{ padding: '8px 0' }}>{vehicle.gvwr.toLocaleString()} lbs</td>
                </tr>
              )}
              {vehicle.curbWeight && (
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Curb Weight:</td>
                  <td style={{ padding: '8px 0' }}>{vehicle.curbWeight.toLocaleString()} lbs</td>
                </tr>
              )}
              {vehicle.payloadCapacity && (
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Payload Capacity:</td>
                  <td style={{ padding: '8px 0' }}>{vehicle.payloadCapacity.toLocaleString()} lbs</td>
                </tr>
              )}
              {vehicle.towingCapacity && (
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Towing Capacity:</td>
                  <td style={{ padding: '8px 0' }}>{vehicle.towingCapacity.toLocaleString()} lbs</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      {/* Dimensions */}
      {(vehicle.overallLength || vehicle.overallWidth || vehicle.overallHeight) && (
        <section style={{ marginBottom: '20px', pageBreakInside: 'avoid' }}>
          <h2 style={{ fontSize: '18px', borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '10px' }}>
            Dimensions
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {vehicle.overallLength && (
                <tr>
                  <td style={{ padding: '8px 0', width: '30%', fontWeight: 'bold' }}>Overall Length:</td>
                  <td style={{ padding: '8px 0' }}>{vehicle.overallLength} in</td>
                </tr>
              )}
              {vehicle.overallWidth && (
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Overall Width:</td>
                  <td style={{ padding: '8px 0' }}>{vehicle.overallWidth} in</td>
                </tr>
              )}
              {vehicle.overallHeight && (
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Overall Height:</td>
                  <td style={{ padding: '8px 0' }}>{vehicle.overallHeight} in</td>
                </tr>
              )}
              {vehicle.wheelbase && (
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Wheelbase:</td>
                  <td style={{ padding: '8px 0' }}>{vehicle.wheelbase} in</td>
                </tr>
              )}
              {vehicle.groundClearance && (
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Ground Clearance:</td>
                  <td style={{ padding: '8px 0' }}>{vehicle.groundClearance} in</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      {/* Commercial Details */}
      {(vehicle.purchaseDate || vehicle.purchasePrice || vehicle.warrantyExpiration) && (
        <section style={{ marginBottom: '20px', pageBreakInside: 'avoid' }}>
          <h2 style={{ fontSize: '18px', borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '10px' }}>
            Commercial Details
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {vehicle.purchaseDate && (
                <tr>
                  <td style={{ padding: '8px 0', width: '30%', fontWeight: 'bold' }}>Purchase Date:</td>
                  <td style={{ padding: '8px 0' }}>{new Date(vehicle.purchaseDate).toLocaleDateString()}</td>
                </tr>
              )}
              {vehicle.purchasePrice && (
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Purchase Price:</td>
                  <td style={{ padding: '8px 0' }}>${vehicle.purchasePrice.toLocaleString()}</td>
                </tr>
              )}
              {vehicle.purchaseLocation && (
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Purchase Location:</td>
                  <td style={{ padding: '8px 0' }}>{vehicle.purchaseLocation}</td>
                </tr>
              )}
              {vehicle.warrantyExpiration && (
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Warranty Expiration:</td>
                  <td style={{ padding: '8px 0' }}>{new Date(vehicle.warrantyExpiration).toLocaleDateString()}</td>
                </tr>
              )}
              {vehicle.registrationExpiration && (
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Registration Expiration:</td>
                  <td style={{ padding: '8px 0' }}>{new Date(vehicle.registrationExpiration).toLocaleDateString()}</td>
                </tr>
              )}
              {vehicle.titleNumber && (
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Title Number:</td>
                  <td style={{ padding: '8px 0' }}>{vehicle.titleNumber}</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      {/* Notes */}
      {vehicle.notes && (
        <section style={{ marginBottom: '20px', pageBreakInside: 'avoid' }}>
          <h2 style={{ fontSize: '18px', borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '10px' }}>
            Notes
          </h2>
          <div style={{ padding: '10px', backgroundColor: COLORS.gray100, borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
            {vehicle.notes}
          </div>
        </section>
      )}

      {/* Footer */}
      <div style={{ marginTop: '40px', paddingTop: '10px', borderTop: '1px solid #ddd', fontSize: '12px', color: '#666' }}>
        <p>Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
        <p>
          Created: {new Date(vehicle.creAt).toLocaleDateString()} by {vehicle.creBy} |
          Modified: {new Date(vehicle.modAt).toLocaleDateString()} by {vehicle.modBy}
        </p>
      </div>

      <style jsx global>{`
        @media print {
          .print-template {
            padding: 0 !important;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  )
}
