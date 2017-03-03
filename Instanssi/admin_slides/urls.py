# -*- coding: utf-8 -*-

from django.conf.urls import url
from Instanssi.admin_slides.views import index, slide_entries, slide_results
from Instanssi.admin_slides.views import slide_entries_with_images


urlpatterns = [
    url(r'^$', index, name="index"),
    url(r'^slide_entries/(?P<compo_id>\d+)/', slide_entries, name="entries"),
    url(r'^slide_results/(?P<compo_id>\d+)/', slide_results, name="results"),
    url(r'^slide_entries_with_images/(?P<compo_id>\d+)/', slide_entries_with_images, name="entries_with_images"),
]
