# -*- coding: utf-8 -*-
# Generated by Django 1.9.1 on 2016-01-29 23:25
from __future__ import unicode_literals

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('kompomaatti', '0003_auto_20160124_1939'),
    ]

    operations = [
        migrations.AlterField(
            model_name='ticketvotecode',
            name='ticket',
            field=models.ForeignKey(blank=True, help_text='Lipputuote jonka avainta k\xe4ytet\xe4\xe4n \xe4\xe4nestysavaimena', null=True, on_delete=django.db.models.deletion.SET_NULL, to='store.TransactionItem', verbose_name='Lipputuote'),
        ),
    ]