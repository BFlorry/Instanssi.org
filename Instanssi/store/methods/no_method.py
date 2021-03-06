# -*- coding: utf-8 -*-

from django.core.urlresolvers import reverse
from django.shortcuts import render
from Instanssi.store.utils import ta_common


def start_process(ta):
    """
    No payment method was required, so just mark everything done right away.
    """

    # Since no payment is required, just mark everything done right away
    ta.payment_method_name = 'No payment'
    ta.save()
    ta.refresh_from_db()

    ta_common.handle_payment(ta)

    # All done, redirect user
    return reverse('store:pm:no-method-success')


def handle_success(request):
    return render(request, 'store/success.html')
