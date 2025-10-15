import React, { useCallback, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { Box, Button, Flex, Textarea, TextInput, Typography } from '@strapi/design-system';
import { Check } from '@strapi/icons';
import { Form, Layouts, Page, useFetchClient, useNotification, useRBAC } from '@strapi/strapi/admin';
import pluginPermissions from '../../permissions';
import getTrad from '../../utils/getTrad';

type EmailSettings = {
  defaultFrom: string;
  defaultReplyTo: string;
  subject: string;
  text: string;
  html: string;
};

const SETTINGS_ENDPOINT = '/strapi-plugin-nextauth/settings';

const defaultSettings: EmailSettings = {
  defaultFrom: '',
  defaultReplyTo: '',
  subject: '',
  text: '',
  html: '',
};

const SettingsPage = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { get, put } = useFetchClient();

  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { isLoading: isRBACLoading, allowedActions } = useRBAC(pluginPermissions.updateSettings);

  const canUpdate = allowedActions?.canUpdate ?? false;

  const translated = useCallback(
    (id: string, defaultMessage: string, values?: Record<string, unknown>) =>
      formatMessage({ id: getTrad(id), defaultMessage }, values as any),
    [formatMessage],
  );

  const loadSettings = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await get(SETTINGS_ENDPOINT);
      const data = response.data ?? {};

      const nextValues: EmailSettings = {
        defaultFrom: data.defaultFrom ?? '',
        defaultReplyTo: data.defaultReplyTo ?? '',
        subject: data.subject ?? '',
        text: data.text ?? '',
        html: data.html ?? '',
      };

      setSettings(nextValues);
    } catch (error) {
      toggleNotification({
        type: 'danger',
        message: translated('settings.notifications.loadError', 'Failed to load settings'),
      });
      setSettings(defaultSettings);
    } finally {
      setIsLoading(false);
    }
  }, [get, toggleNotification, translated]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSubmit = useCallback(
    async (values: EmailSettings) => {
      try {
        const response = await put(SETTINGS_ENDPOINT, values);
        const savedValues: EmailSettings = {
          defaultFrom: response.data?.defaultFrom ?? values.defaultFrom ?? '',
          defaultReplyTo: response.data?.defaultReplyTo ?? values.defaultReplyTo ?? '',
          subject: response.data?.subject ?? values.subject ?? '',
          text: response.data?.text ?? values.text ?? '',
          html: response.data?.html ?? values.html ?? '',
        };

        setSettings(savedValues);

        toggleNotification({
          type: 'success',
          message: translated('settings.notifications.saveSuccess', 'Settings saved'),
        });
      } catch (error) {
        toggleNotification({
          type: 'danger',
          message: translated('settings.notifications.saveError', 'Failed to save settings'),
        });
      }
    },
    [put, toggleNotification, translated],
  );

  if (isLoading || isRBACLoading || !settings) {
    return <Page.Loading />;
  }

  return (
    <Page.Main>
      <Page.Title>{translated('settings.header.title', 'Magic Link email templates')}</Page.Title>
      <Form width="auto" height="auto" method="PUT" initialValues={settings} onSubmit={handleSubmit} disabled={!canUpdate}>
        {({ values, onChange, isSubmitting, modified }) => (
          <>
            <Layouts.Header
              title={translated('settings.header.title', 'Magic Link email templates')}
              primaryAction={
                <Button
                  type="submit"
                  startIcon={<Check />}
                  loading={isSubmitting}
                  disabled={!modified || !canUpdate}
                  size="S"
                >
                  {translated('global.save', 'Save')}
                </Button>
              }
            />

            <Layouts.Content>
              <Flex direction="column" gap={6} alignItems="stretch">
                <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius>
                  <Flex direction="column" gap={2} alignItems="stretch">
                    <Typography variant="pi" fontWeight="bold">
                      {translated('settings.fields.subject.label', 'Email subject')}
                    </Typography>
                    <TextInput
                      name="subject"
                      value={values.subject ?? ''}
                      onChange={onChange}
                      placeholder={translated('settings.fields.subject.placeholder', 'Your sign-in link')}
                      required
                      disabled={!canUpdate}
                    />
                  </Flex>
                </Box>

                <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius>
                  <Flex direction="column" gap={2} alignItems="stretch">
                    <Typography variant="pi" fontWeight="bold">
                      {translated('settings.fields.defaultFrom.label', 'Default from')}
                    </Typography>
                    <TextInput
                      name="defaultFrom"
                      value={values.defaultFrom ?? ''}
                      onChange={onChange}
                      placeholder="no-reply@example.com"
                      required
                      disabled={!canUpdate}
                    />
                  </Flex>
                </Box>

                <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius>
                  <Flex direction="column" gap={2} alignItems="stretch">
                    <Typography variant="pi" fontWeight="bold">
                      {translated('settings.fields.defaultReplyTo.label', 'Default reply-to')}
                    </Typography>
                    <TextInput
                      name="defaultReplyTo"
                      value={values.defaultReplyTo ?? ''}
                      onChange={onChange}
                      placeholder="support@example.com"
                      disabled={!canUpdate}
                    />
                  </Flex>
                </Box>

                <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius>
                  <Flex direction="column" gap={2} alignItems="stretch">
                    <Typography variant="pi" fontWeight="bold">
                      {translated('settings.fields.text.label', 'Plain text body')}
                    </Typography>
                    <Textarea
                      name="text"
                      value={values.text ?? ''}
                      onChange={onChange}
                      required
                      disabled={!canUpdate}
                      style={{ minHeight: 420 }}
                      hint={translated(
                        'settings.fields.text.hint',
                        'The plain text fallback shown by clients that do not support HTML emails.',
                      )}
                    />
                  </Flex>
                </Box>

                <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius>
                  <Flex direction="column" gap={2} alignItems="stretch">
                    <Typography variant="pi" fontWeight="bold">
                      {translated('settings.fields.html.label', 'Email html body')}
                    </Typography>
                    <Textarea
                      name="html"
                      value={values.html ?? ''}
                      onChange={onChange}
                      required
                      disabled={!canUpdate}
                      style={{ minHeight: 420 }}
                      hint={translated(
                        'settings.fields.html.hint',
                        'Use placeholders like {MAGIC_LINK} and {CODE}; they will be replaced automatically.',
                        {
                          MAGIC_LINK: '{{MAGIC_LINK}}',
                          CODE: '{{CODE}}',
                        },
                      )}
                    />
                  </Flex>
                </Box>
              </Flex>
            </Layouts.Content>
          </>
        )}
      </Form>
    </Page.Main>
  );
};

const ProtectedSettingsPage = () => (
  <Page.Protect permissions={pluginPermissions.readSettings}>
    <SettingsPage />
  </Page.Protect>
);

export default ProtectedSettingsPage;
