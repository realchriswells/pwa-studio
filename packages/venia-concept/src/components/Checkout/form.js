import React, { Fragment, useCallback, useState } from 'react';
import { array, bool, func, object, shape, string } from 'prop-types';

import { Price } from '@magento/peregrine';
import AddressForm from './addressForm';
import PaymentsForm from './paymentsForm';
import ShippingForm from './shippingForm';
import Button from 'src/components/Button';
import Section from './section';
import { mergeClasses } from 'src/classify';
import defaultClasses from './form.css';

const isSubmitDisabled = (busy, valid) => busy || !valid;

const EditableForm = props => {
    const {
        editing,
        setEditing,
        submitShippingAddress,
        submitShippingMethod,
        submitPaymentMethodAndBillingAddress,
        submitting,
        isAddressIncorrect,
        incorrectAddressMessage,
        directory: { countries }
    } = props;

    const handleCancel = useCallback(() => {
        setEditing(null);
    }, [setEditing]);

    const handleSubmitAddressForm = useCallback(
        async formValues => {
            await submitShippingAddress({
                type: 'shippingAddress',
                formValues
            });
            setEditing(null);
        },
        [submitShippingAddress]
    );

    const handleSubmitPaymentsForm = useCallback(
        async formValues => {
            await submitPaymentMethodAndBillingAddress({
                formValues
            });
            setEditing(null);
        },
        [submitPaymentMethodAndBillingAddress]
    );

    const handleSubmitShippingForm = useCallback(
        async formValues => {
            await submitShippingMethod({
                type: 'shippingMethod',
                formValues
            });
            setEditing(null);
        },
        [submitShippingMethod]
    );

    switch (editing) {
        case 'address': {
            const { shippingAddress } = props;

            return (
                <AddressForm
                    initialValues={shippingAddress}
                    submitting={submitting}
                    countries={countries}
                    cancel={handleCancel}
                    submit={handleSubmitAddressForm}
                    isAddressIncorrect={isAddressIncorrect}
                    incorrectAddressMessage={incorrectAddressMessage}
                />
            );
        }
        case 'paymentMethod': {
            const { billingAddress } = props;

            return (
                <PaymentsForm
                    cancel={handleCancel}
                    initialValues={billingAddress}
                    submit={handleSubmitPaymentsForm}
                    submitting={submitting}
                    countries={countries}
                />
            );
        }
        case 'shippingMethod': {
            const { availableShippingMethods, shippingMethod } = props;
            return (
                <ShippingForm
                    availableShippingMethods={availableShippingMethods}
                    cancel={handleCancel}
                    shippingMethod={shippingMethod}
                    submit={handleSubmitShippingForm}
                    submitting={submitting}
                />
            );
        }
        default: {
            return null;
        }
    }
};

const PaymentMethodSummary = props => {
    const { classes, hasPaymentMethod, paymentData } = props;

    if (!hasPaymentMethod) {
        return (
            <span className={classes.informationPrompt}>
                Add Billing Information
            </span>
        );
    }

    let primaryDisplay = '';
    let secondaryDisplay = '';
    if (paymentData) {
        primaryDisplay = paymentData.details.cardType;
        secondaryDisplay = paymentData.description;
    }

    return (
        <Fragment>
            <strong className={classes.paymentDisplayPrimary}>
                {primaryDisplay}
            </strong>
            <br />
            <span className={classes.paymentDisplaySecondary}>
                {secondaryDisplay}
            </span>
        </Fragment>
    );
};

const ShippingAddressSummary = props => {
    const { classes, hasShippingAddress, shippingAddress } = props;

    if (!hasShippingAddress) {
        return (
            <span className={classes.informationPrompt}>
                Add Shipping Information
            </span>
        );
    }

    const name = `${shippingAddress.firstname} ${shippingAddress.lastname}`;
    const street = shippingAddress.street.join(' ');

    return (
        <Fragment>
            <strong>{name}</strong>
            <br />
            <span>{street}</span>
        </Fragment>
    );
};

const ShippingMethodSummary = props => {
    const { classes, hasShippingMethod, shippingTitle } = props;

    if (!hasShippingMethod) {
        return (
            <span className={classes.informationPrompt}>
                Specify Shipping Method
            </span>
        );
    }

    return (
        <Fragment>
            <strong>{shippingTitle}</strong>
        </Fragment>
    );
};

const Overview = props => {
    const {
        cart,
        cancelCheckout,
        classes,
        setEditing,
        hasPaymentMethod,
        hasShippingAddress,
        hasShippingMethod,
        paymentData,
        ready,
        shippingAddress,
        shippingTitle,
        submitOrder,
        submitting
    } = props;

    const handleDismiss = useCallback(() => {
        cancelCheckout();
    }, [cancelCheckout]);

    const handleAddressFormClick = useCallback(() => {
        setEditing('address');
    }, [setEditing]);

    const handlePaymentFormClick = useCallback(() => {
        setEditing('paymentMethod');
    }, [setEditing]);

    const handleShippingFormClick = useCallback(() => {
        setEditing('shippingMethod');
    }, [setEditing]);

    return (
        <Fragment>
            <div className={classes.body}>
                <Section
                    label="Ship To"
                    onClick={handleAddressFormClick}
                    showEditIcon={hasShippingAddress}
                >
                    <ShippingAddressSummary
                        classes={classes}
                        hasShippingAddress={hasShippingAddress}
                        shippingAddress={shippingAddress}
                    />
                </Section>
                <Section
                    label="Pay With"
                    onClick={handlePaymentFormClick}
                    showEditIcon={hasPaymentMethod}
                >
                    <PaymentMethodSummary
                        classes={classes}
                        hasPaymentMethod={hasPaymentMethod}
                        paymentData={paymentData}
                    />
                </Section>
                <Section
                    label="Use"
                    onClick={handleShippingFormClick}
                    showEditIcon={hasShippingMethod}
                >
                    <ShippingMethodSummary
                        classes={classes}
                        hasShippingMethod={hasShippingMethod}
                        shippingTitle={shippingTitle}
                    />
                </Section>
                <Section label="TOTAL">
                    <Price
                        currencyCode={cart.totals.quote_currency_code}
                        value={cart.totals.subtotal || 0}
                    />
                    <br />
                    <span>{cart.details.items_qty} Items</span>
                </Section>
            </div>
            <div className={classes.footer}>
                <Button onClick={handleDismiss}>Back to Cart</Button>
                <Button
                    priority="high"
                    disabled={isSubmitDisabled(submitting, ready)}
                    onClick={submitOrder}
                >
                    Confirm Order
                </Button>
            </div>
        </Fragment>
    );
};

const Form = props => {
    const classes = mergeClasses(defaultClasses, props.classes);

    const [editing, setEditing] = useState(null);
    let child;
    if (editing) {
        const editableFormProps = {
            editing,
            setEditing,
            ...props
        };
        child = <EditableForm {...editableFormProps} />;
    } else {
        const overviewProps = {
            classes,
            editing,
            setEditing,
            ...props
        };
        child = <Overview {...overviewProps} />;
    }

    return <div className={classes.root}>{child}</div>;
};

Form.propTypes = {
    availableShippingMethods: array,
    billingAddress: shape({
        city: string,
        country_id: string,
        email: string,
        firstname: string,
        lastname: string,
        postcode: string,
        region_id: string,
        region_code: string,
        region: string,
        street: array,
        telephone: string
    }),
    cancelCheckout: func.isRequired,
    cart: shape({
        details: object,
        cartId: string,
        totals: object
    }).isRequired,
    directory: shape({
        countries: array
    }).isRequired,
    classes: shape({
        body: string,
        footer: string,
        informationPrompt: string,
        'informationPrompt--disabled': string,
        paymentDisplayPrimary: string,
        paymentDisplaySecondary: string,
        root: string
    }),
    hasPaymentMethod: bool,
    hasShippingAddress: bool,
    hasShippingMethod: bool,
    incorrectAddressMessage: string,
    isAddressIncorrect: bool,
    paymentData: shape({
        description: string,
        details: shape({
            cardType: string
        }),
        nonce: string
    }),
    ready: bool,
    shippingAddress: shape({
        city: string,
        country_id: string,
        email: string,
        firstname: string,
        lastname: string,
        postcode: string,
        region_id: string,
        region_code: string,
        region: string,
        street: array,
        telephone: string
    }),
    shippingMethod: string,
    shippingTitle: string,
    submitShippingAddress: func.isRequired,
    submitOrder: func.isRequired,
    submitPaymentMethodAndBillingAddress: func.isRequired,
    submitShippingMethod: func.isRequired,
    submitting: bool.isRequired
};

export default Form;
