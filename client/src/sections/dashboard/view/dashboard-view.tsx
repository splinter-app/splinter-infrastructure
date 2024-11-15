import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';

import { DashboardContent } from 'src/layouts/dashboard';
import { Box, CircularProgress } from '@mui/material';

import { EventLogs } from '../event-logs';
import { DataMetrics } from '../data-metrics';
import { OverviewCard } from '../overview-card';
import { useWebSocket } from './useWebSocket';

// ----------------------------------------------------------------------

export function DashboardView() {
  const { data, loading } = useWebSocket();

  const getLogType = (message: string): string => {
    if (message.includes('ingest process finished in') || message.includes('writing a total')) {
      return 'type1'; // Success
    }
    if (message.includes('Deleting')) {
      return 'type4'; // Deletion
    }
    if (
      message.includes('PartitionStep') ||
      message.includes('ChunkStep') ||
      message.includes('EmbedStep')
    ) {
      return 'type2'; // Partitioning
    }
    if (message.includes('error') || message.includes('failed')) {
      return 'type6'; // Error
    }
    return 'type8'; // Default
  };

  const cleanLogMessage = (message: string): string => {
    const regex = /^(.*?)(Process)\s+/;
    return message.replace(regex, '');
  };

  const mappedLogs =
    data?.logs?.map((log, index) => ({
      id: `log-${index}`,
      type: getLogType(log.message),
      title: cleanLogMessage(log.message),
      time: log.timestamp,
    })) ?? [];

  const totalVectors = data?.totalVectors || 0;
  const totalDocuments = data?.totalDocuments || 0;
  const vectorsWritten = data?.vectorsWritten || 0;
  const documentsIngested = data?.documentsIngested || 0;

  const sourceDestinationEmbedding = data?.sourceDestinationEmbedding || '||';
  const [source, destination, embedding] = sourceDestinationEmbedding.split('|');
  const sourceConnector = source || 'Unknown Source';
  const destinationConnector = destination || 'Unknown Destination';
  const embeddingProvider = embedding || 'Unknown Embedding';

  const jobStatusCounts = data?.jobStatusCounts || {
    SUBMITTED: 0,
    STARTING: 0,
    PENDING: 0,
    RUNNING: 0,
    SUCCEEDED: 0,
    FAILED: 0,
  };

  if (loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        height="100vh"
      >
        <CircularProgress size={50} color="primary" />
        <Typography variant="h6" sx={{ marginTop: 2 }}>
          Loading data, please wait...
        </Typography>
      </Box>
    );
  }

  return (
    <DashboardContent maxWidth="xl">
      <Typography variant="h4" sx={{ mb: { xs: 3, md: 5 } }}>
        Splinter Dashboard
      </Typography>

      <Grid container spacing={3}>
        <Grid xs={12} sm={6} md={3}>
          <OverviewCard
            title="Pipeline Status"
            text="Deployed"
            color="success"
            icon={<img alt="icon" src="/assets/icons/dashboard/ic-deploy.svg" />}
          />
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <OverviewCard
            title="Source Connector"
            text={sourceConnector}
            color="warning"
            icon={<img alt="icon" src="/assets/icons/dashboard/ic-source.svg" />}
          />
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <OverviewCard
            title="Destination Connector"
            text={destinationConnector}
            color="info"
            icon={<img alt="icon" src="/assets/icons/dashboard/ic-database.svg" />}
          />
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <OverviewCard
            title="Embedding Provider"
            text={embeddingProvider}
            color="secondary"
            icon={<img alt="icon" src="/assets/icons/dashboard/ic-embedding.svg" />}
          />
        </Grid>

        <Grid xs={12} sm={6} md={6} lg={6}>
          <DataMetrics
            title="Data Ingestion"
            list={[
              { label: 'Documents Ingested', total: documentsIngested },
              { label: 'Vectors Written', total: vectorsWritten },
              { label: 'Documents in Database', total: totalDocuments },
              { label: 'Vectors in Database', total: totalVectors },
            ]}
          />
        </Grid>

        <Grid xs={12} sm={6} md={6} lg={6}>
          <DataMetrics
            title="Ingestion Progress"
            list={[
              { label: 'Starting', total: jobStatusCounts.STARTING },
              { label: 'Running', total: jobStatusCounts.RUNNING },
              { label: 'Succeeded', total: jobStatusCounts.SUCCEEDED },
              { label: 'Failed', total: jobStatusCounts.FAILED },
            ]}
          />
        </Grid>

        <Grid xs={12} md={12} lg={12}>
          <EventLogs title="Event Logs" list={mappedLogs} />
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
