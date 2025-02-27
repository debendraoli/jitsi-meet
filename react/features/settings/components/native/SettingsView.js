// @flow

import { Link } from '@react-navigation/native';
import React from 'react';
import {
    Alert,
    NativeModules,
    Platform,
    ScrollView,
    Text,
    View
} from 'react-native';
import {
    Divider,
    TextInput,
    withTheme
} from 'react-native-paper';

import { Avatar } from '../../../base/avatar';
import { translate } from '../../../base/i18n';
import JitsiScreen from '../../../base/modal/components/JitsiScreen';
import {
    getLocalParticipant,
    getParticipantDisplayName
} from '../../../base/participants';
import { connect } from '../../../base/redux';
import Switch from '../../../base/ui/components/native/Switch';
import { screen } from '../../../mobile/navigation/routes';
import { AVATAR_SIZE } from '../../../welcome/components/styles';
import { normalizeUserInputURL, isServerURLChangeEnabled } from '../../functions';
import {
    AbstractSettingsView,
    _mapStateToProps as _abstractMapStateToProps,
    type Props as AbstractProps
} from '../AbstractSettingsView';

import FormRow from './FormRow';
import FormSectionAccordion from './FormSectionAccordion';
import styles, { PLACEHOLDER_COLOR, PLACEHOLDER_TEXT_COLOR } from './styles';

/**
 * Application information module.
 */
const { AppInfo } = NativeModules;


type State = {

    /**
     * State variable for the disable call integration switch.
     */
    disableCallIntegration: boolean,

    /**
     * State variable for the disable p2p switch.
     */
    disableP2P: boolean,

    /**
     * State variable for the disable crash reporting switch.
     */
    disableCrashReporting: boolean,

    /**
     * State variable for the display name field.
     */
    displayName: string,

    /**
     * State variable for the email field.
     */
    email: string,

    /**
     * State variable for the server URL field.
     */
    serverURL: string,

    /**
     * State variable for the start with audio muted switch.
     */
    startWithAudioMuted: boolean,

    /**
     * State variable for the start with video muted switch.
     */
    startWithVideoMuted: boolean
}

/**
 * The type of the React {@code Component} props of
 * {@link SettingsView}.
 */
type Props = AbstractProps & {

    /**
     * Flag indicating if URL can be changed by user.
     *
     * @protected
     */
    _serverURLChangeEnabled: boolean,

    /**
     * Avatar label.
     */
    avatarLabel: string,

    /**
     * The ID of the local participant.
     */
    localParticipantId: string,

    /**
     * Default prop for navigating between screen components(React Navigation).
     */
    navigation: Object,

    /**
     * Callback to be invoked when settings screen is focused.
     */
    onSettingsScreenFocused: Function,

    /**
     * Theme used for styles.
     */
    theme: Object
}

/**
 * The native container rendering the app settings page.
 *
 * @augments AbstractSettingsView
 */
class SettingsView extends AbstractSettingsView<Props, State> {
    _urlField: Object;

    /**
     *
     * Initializes a new {@code SettingsView} instance.
     *
     * @inheritdoc
     */
    constructor(props) {
        super(props);
        const {
            disableCallIntegration,
            disableCrashReporting,
            disableP2P,
            displayName,
            email,
            serverURL,
            startWithAudioMuted,
            startWithVideoMuted
        } = props._settings || {};

        this.state = {
            disableCallIntegration,
            disableCrashReporting,
            disableP2P,
            displayName,
            email,
            serverURL,
            startWithAudioMuted,
            startWithVideoMuted
        };

        // Bind event handlers so they are only bound once per instance.
        this._onBlurServerURL = this._onBlurServerURL.bind(this);
        this._onClose = this._onClose.bind(this);
        this._onDisableCallIntegration = this._onDisableCallIntegration.bind(this);
        this._onDisableCrashReporting = this._onDisableCrashReporting.bind(this);
        this._onDisableP2P = this._onDisableP2P.bind(this);
        this._setURLFieldReference = this._setURLFieldReference.bind(this);
        this._showURLAlert = this._showURLAlert.bind(this);
    }

    /**
     * Implements React's {@link Component#render()}, renders the settings page.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    render() {
        const {
            disableCallIntegration,
            disableCrashReporting,
            disableP2P,
            displayName,
            email,
            serverURL,
            startWithAudioMuted,
            startWithVideoMuted
        } = this.state;
        const { palette } = this.props.theme;

        const textInputTheme = {
            colors: {
                background: palette.ui01,
                placeholder: palette.text01,
                primary: PLACEHOLDER_COLOR,
                underlineColor: 'transparent',
                text: palette.text01
            }
        };

        return (
            <JitsiScreen
                safeAreaInsets = { [ 'bottom', 'left', 'right' ] }
                style = { styles.settingsViewContainer }>
                <ScrollView>
                    <View style = { styles.avatarContainer }>
                        <Avatar
                            participantId = { this.props.localParticipantId }
                            size = { AVATAR_SIZE } />
                        <Text style = { styles.avatarLabel }>
                            { this.props.avatarLabel }
                        </Text>
                    </View>
                    <FormSectionAccordion
                        label = 'settingsView.profileSection'>
                        <TextInput
                            autoCorrect = { false }
                            label = { this.props.t('settingsView.displayName') }
                            mode = 'outlined'
                            onChangeText = { this._onChangeDisplayName }
                            placeholder = { this.props.t('settingsView.displayNamePlaceholderText') }
                            placeholderTextColor = { PLACEHOLDER_TEXT_COLOR }
                            spellCheck = { false }
                            style = { styles.textInputContainer }
                            textContentType = { 'name' } // iOS only
                            theme = { textInputTheme }
                            value = { displayName } />
                        <Divider style = { styles.fieldSeparator } />
                        <TextInput
                            autoCapitalize = 'none'
                            autoCorrect = { false }
                            keyboardType = { 'email-address' }
                            label = { this.props.t('settingsView.email') }
                            mode = 'outlined'
                            onChangeText = { this._onChangeEmail }
                            placeholder = 'email@example.com'
                            placeholderTextColor = { PLACEHOLDER_TEXT_COLOR }
                            spellCheck = { false }
                            style = { styles.textInputContainer }
                            textContentType = { 'emailAddress' } // iOS only
                            theme = { textInputTheme }
                            value = { email } />
                    </FormSectionAccordion>
                    <FormSectionAccordion
                        label = 'settingsView.conferenceSection'>
                        <TextInput
                            autoCapitalize = 'none'
                            autoCorrect = { false }
                            editable = { this.props._serverURLChangeEnabled }
                            keyboardType = { 'url' }
                            label = { this.props.t('settingsView.serverURL') }
                            mode = 'outlined'
                            onBlur = { this._onBlurServerURL }
                            onChangeText = { this._onChangeServerURL }
                            placeholder = { this.props._serverURL }
                            placeholderTextColor = { PLACEHOLDER_TEXT_COLOR }
                            spellCheck = { false }
                            style = { styles.textInputContainer }
                            textContentType = { 'URL' } // iOS only
                            theme = { textInputTheme }
                            value = { serverURL } />
                        <Divider style = { styles.fieldSeparator } />
                        <FormRow
                            label = 'settingsView.startWithAudioMuted'>
                            <Switch
                                checked = { startWithAudioMuted }
                                onChange = { this._onStartAudioMutedChange } />
                        </FormRow>
                        <Divider style = { styles.fieldSeparator } />
                        <FormRow label = 'settingsView.startWithVideoMuted'>
                            <Switch
                                checked = { startWithVideoMuted }
                                onChange = { this._onStartVideoMutedChange } />
                        </FormRow>
                    </FormSectionAccordion>
                    <FormSectionAccordion
                        label = 'settingsView.links'>
                        <Link
                            style = { styles.sectionLink }
                            to = {{ screen: screen.settings.links.help }}>
                            { this.props.t('settingsView.help') }
                        </Link>
                        <Divider style = { styles.fieldSeparator } />
                        <Link
                            style = { styles.sectionLink }
                            to = {{ screen: screen.settings.links.terms }}>
                            { this.props.t('settingsView.terms') }
                        </Link>
                        <Divider style = { styles.fieldSeparator } />
                        <Link
                            style = { styles.sectionLink }
                            to = {{ screen: screen.settings.links.privacy }}>
                            { this.props.t('settingsView.privacy') }
                        </Link>
                    </FormSectionAccordion>
                    <FormSectionAccordion
                        label = 'settingsView.buildInfoSection'>
                        <FormRow
                            label = 'settingsView.version'>
                            <Text style = { styles.text }>
                                {`${AppInfo.version} build ${AppInfo.buildNumber}`}
                            </Text>
                        </FormRow>
                    </FormSectionAccordion>
                    <FormSectionAccordion
                        label = 'settingsView.advanced'>
                        { Platform.OS === 'android' && (
                            <>
                                <FormRow
                                    label = 'settingsView.disableCallIntegration'>
                                    <Switch
                                        checked = { disableCallIntegration }
                                        onChange = { this._onDisableCallIntegration } />
                                </FormRow>
                                <Divider style = { styles.fieldSeparator } />
                            </>
                        )}
                        <FormRow
                            label = 'settingsView.disableP2P'>
                            <Switch
                                checked = { disableP2P }
                                onChange = { this._onDisableP2P } />
                        </FormRow>
                        <Divider style = { styles.fieldSeparator } />
                        {AppInfo.GOOGLE_SERVICES_ENABLED && (
                            <FormRow
                                fieldSeparator = { true }
                                label = 'settingsView.disableCrashReporting'>
                                <Switch
                                    checked = { disableCrashReporting }
                                    onChange = { this._onDisableCrashReporting } />
                            </FormRow>
                        )}
                    </FormSectionAccordion>
                </ScrollView>
            </JitsiScreen>
        );
    }

    _onBlurServerURL: () => void;

    /**
     * Handler the server URL lose focus event. Here we validate the server URL
     * and update it to the normalized version, or show an error if incorrect.
     *
     * @private
     * @returns {void}
     */
    _onBlurServerURL() {
        this._processServerURL(false /* hideOnSuccess */);
    }

    /**
     * Callback to update the display name.
     *
     * @param {string} displayName - The new value to set.
     * @returns {void}
     */
    _onChangeDisplayName(displayName) {
        super._onChangeDisplayName(displayName);
        this.setState({
            displayName
        });
    }

    /**
     * Callback to update the email.
     *
     * @param {string} email - The new value to set.
     * @returns {void}
     */
    _onChangeEmail(email) {
        super._onChangeEmail(email);
        this.setState({
            email
        });
    }

    /**
     * Callback to update the server URL.
     *
     * @param {string} serverURL - The new value to set.
     * @returns {void}
     */
    _onChangeServerURL(serverURL) {
        super._onChangeServerURL(serverURL);
        this.setState({
            serverURL
        });
    }

    _onDisableCallIntegration: (boolean) => void;

    /**
     * Handles the disable call integration change event.
     *
     * @param {boolean} disableCallIntegration - The new value
     * option.
     * @private
     * @returns {void}
     */
    _onDisableCallIntegration(disableCallIntegration) {
        this._updateSettings({
            disableCallIntegration
        });
        this.setState({
            disableCallIntegration
        });
    }

    _onDisableP2P: (boolean) => void;

    /**
     * Handles the disable P2P change event.
     *
     * @param {boolean} disableP2P - The new value
     * option.
     * @private
     * @returns {void}
     */
    _onDisableP2P(disableP2P) {
        this._updateSettings({
            disableP2P
        });
        this.setState({
            disableP2P
        });
    }

    _onDisableCrashReporting: (boolean) => void;

    /**
     * Handles the disable crash reporting change event.
     *
     * @param {boolean} disableCrashReporting - The new value
     * option.
     * @private
     * @returns {void}
     */
    _onDisableCrashReporting(disableCrashReporting) {
        if (disableCrashReporting) {
            this._showCrashReportingDisableAlert();
        } else {
            this._disableCrashReporting(disableCrashReporting);
        }
    }

    _onClose: () => void;

    /**
     * Callback to be invoked on closing the modal. Also invokes normalizeUserInputURL to validate
     * the URL entered by the user.
     *
     * @returns {boolean} - True if the modal can be closed.
     */
    _onClose() {
        return this._processServerURL(true /* hideOnSuccess */);
    }

    /**
     * Callback to update the start with audio muted value.
     *
     * @param {boolean} startWithAudioMuted - The new value to set.
     * @returns {void}
     */
    _onStartAudioMutedChange(startWithAudioMuted) {
        super._onStartAudioMutedChange(startWithAudioMuted);
        this.setState({
            startWithAudioMuted
        });
    }

    /**
     * Callback to update the start with video muted value.
     *
     * @param {boolean} startWithVideoMuted - The new value to set.
     * @returns {void}
     */
    _onStartVideoMutedChange(startWithVideoMuted) {
        super._onStartVideoMutedChange(startWithVideoMuted);
        this.setState({
            startWithVideoMuted
        });
    }

    /**
     * Processes the server URL. It normalizes it and an error alert is
     * displayed in case it's incorrect.
     *
     * @param {boolean} hideOnSuccess - True if the dialog should be hidden if
     * normalization / validation succeeds, false otherwise.
     * @private
     * @returns {void}
     */
    _processServerURL(hideOnSuccess: boolean) {
        const { serverURL } = this.props._settings;
        const normalizedURL = normalizeUserInputURL(serverURL);

        if (normalizedURL === null) {
            this._showURLAlert();

            return false;
        }

        this._onChangeServerURL(normalizedURL);

        return hideOnSuccess;
    }

    _setURLFieldReference: (React$ElementRef<*> | null) => void;

    /**
     *  Stores a reference to the URL field for later use.
     *
     * @param {Object} component - The field component.
     * @protected
     * @returns {void}
     */
    _setURLFieldReference(component) {
        this._urlField = component;
    }

    _showURLAlert: () => void;

    /**
     * Shows an alert telling the user that the URL he/she entered was invalid.
     *
     * @returns {void}
     */
    _showURLAlert() {
        const { t } = this.props;

        Alert.alert(
            t('settingsView.alertTitle'),
            t('settingsView.alertURLText'),
            [
                {
                    onPress: () => this._urlField.focus(),
                    text: t('settingsView.alertOk')
                }
            ]
        );
    }

    /**
     * Shows an alert warning the user about disabling crash reporting.
     *
     * @returns {void}
     */
    _showCrashReportingDisableAlert() {
        const { t } = this.props;

        Alert.alert(
            t('settingsView.alertTitle'),
            t('settingsView.disableCrashReportingWarning'),
            [
                {
                    onPress: () => this._disableCrashReporting(true),
                    text: t('settingsView.alertOk')
                },
                {
                    text: t('settingsView.alertCancel')
                }
            ]
        );
    }

    _updateSettings: (Object) => void;

    /**
     * Updates the settings and sets state for disableCrashReporting.
     *
     * @param {boolean} disableCrashReporting - Whether crash reporting is disabled or not.
     * @returns {void}
     */
    _disableCrashReporting(disableCrashReporting) {
        this._updateSettings({ disableCrashReporting });
        this.setState({ disableCrashReporting });
    }
}

/**
 * Maps part of the Redux state to the props of this component.
 *
 * @param {Object} state - The Redux state.
 * @returns {Props}
 */
function _mapStateToProps(state) {
    const localParticipant = getLocalParticipant(state);
    const localParticipantId = localParticipant?.id;
    const avatarLabel = localParticipant && getParticipantDisplayName(state, localParticipantId);

    return {
        ..._abstractMapStateToProps(state),
        _serverURLChangeEnabled: isServerURLChangeEnabled(state),
        avatarLabel,
        localParticipantId
    };
}

export default translate(connect(_mapStateToProps)(withTheme(SettingsView)));
