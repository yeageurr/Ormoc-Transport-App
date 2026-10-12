import { Redirect } from 'expo-router';

// Temporarily disabled on noIncidentReport. Restore the export to bring back the reports screen.
// export { default } from '@/screens/ReportIncidentScreen';
export default function DisabledIncidentReportRoute() {
  return <Redirect href="/tabs" />;
}
